#!/usr/bin/env python3
"""Converts a shorestorm_chNN.py source file's scene functions into the
beats/chapter JSON schema consumed by public/js/engine.js.

Handles: speak(), beat(), say(name,text), adult(name,text), power(name,text),
wait(), a two-option choice()+if/else with state effects, and the
name_the_crew() freeText call in chapter 4. Anything else is appended to
UNHANDLED and must be reviewed by hand (see Task 16).
"""
import ast
import json
import sys

NARRATE_FUNCS = {"speak": "speak", "beat": "beat"}
NAMED_FUNCS = {"say": "say", "adult": "adult", "power": "power"}
FIXED_NAME_FUNCS = {"driver": "Salt"}

UNHANDLED = []


def const_str(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return None


def is_crew_name_get(node):
    """Match s.get('crew_name', <default>) / state.get('crew_name', <default>)."""
    return (
        isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "get"
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id in ("s", "state")
        and len(node.args) >= 1
        and const_str(node.args[0]) == "crew_name"
    )


def joined_str_to_template(node):
    """Turn an f-string with only {name}/{crew_name} references (as a bare
    name or a s.get('crew_name', ...) lookup) into a {{crew_name}} template
    marker. Anything else is flagged."""
    parts = []
    for value in node.values:
        if isinstance(value, ast.Constant):
            parts.append(value.value)
        elif isinstance(value, ast.FormattedValue) and isinstance(value.value, ast.Name):
            var = value.value.id
            if var not in ("name", "crew_name"):
                UNHANDLED.append(f"f-string references unexpected var {var!r}")
                return None
            parts.append("{{crew_name}}")
        elif isinstance(value, ast.FormattedValue) and is_crew_name_get(value.value):
            parts.append("{{crew_name}}")
        else:
            UNHANDLED.append("f-string has an unsupported expression")
            return None
    return "".join(parts)


def call_text_arg(call, index=0):
    if index >= len(call.args):
        UNHANDLED.append(f"call to {call.func.id}() has too few arguments")
        return None
    arg = call.args[index]
    text = const_str(arg)
    if text is not None:
        return text
    if isinstance(arg, ast.JoinedStr):
        return joined_str_to_template(arg)
    UNHANDLED.append(f"non-string arg at index {index} in a call")
    return None


def call_to_beat(call):
    if not isinstance(call.func, ast.Name):
        return None
    fname = call.func.id
    if fname == "wait":
        return {"type": "wait"}
    if fname == "pause":
        return None
    if fname == "slow":
        # A bare slow(text, ...) call directly in a scene body is a one-off
        # styled narration line (e.g. the flyer banner, a closing hook) --
        # not the `slow` primitive definition itself, which convert_story.py
        # never walks since it only processes scene_* function bodies.
        text = call_text_arg(call)
        if text is None:
            return None
        return {"type": "line", "style": "beat", "text": text.strip()}
    if fname in NARRATE_FUNCS:
        text = call_text_arg(call)
        if text is None:
            return None
        return {"type": "line", "style": NARRATE_FUNCS[fname], "text": text}
    if fname in NAMED_FUNCS:
        if len(call.args) < 2:
            UNHANDLED.append(f"call to {fname}() has too few arguments")
            return None
        name = const_str(call.args[0])
        text = call_text_arg(call, 1)
        if name is None or text is None:
            return None
        return {"type": NAMED_FUNCS[fname], "name": name, "text": text}
    if fname in FIXED_NAME_FUNCS:
        text = call_text_arg(call)
        if text is None:
            return None
        return {"type": "adult", "name": FIXED_NAME_FUNCS[fname], "text": text}
    UNHANDLED.append(f"unrecognized call to {fname}()")
    return None


def slot_key(subscript_slice):
    # Python <3.9 wraps the slice in ast.Index(value=Constant(...)); 3.9+
    # gives us the Constant directly. Constant nodes have their own
    # `.value` holding the raw Python value, so only unwrap for Index.
    if isinstance(subscript_slice, ast.Index):
        subscript_slice = subscript_slice.value
    return const_str(subscript_slice)


def is_self_get(node, key):
    """Match s.get('key', <default>) / state.get('key', <default>)."""
    return (
        isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "get"
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id in ("s", "state")
        and len(node.args) >= 1
        and const_str(node.args[0]) == key
    )


def running_total_delta(value_node, key):
    """Match `state.get('key', 0) + N` / `N + state.get('key', 0)`, the
    non-AugAssign spelling of an accumulating counter. Returns N or None."""
    if not (isinstance(value_node, ast.BinOp) and isinstance(value_node.op, ast.Add)):
        return None
    left, right = value_node.left, value_node.right
    if is_self_get(left, key) and isinstance(right, ast.Constant) and isinstance(right.value, (int, float)):
        return right.value
    if is_self_get(right, key) and isinstance(left, ast.Constant) and isinstance(left.value, (int, float)):
        return left.value
    return None


def state_effect_from_stmt(stmt):
    """If stmt is a state["key"] = value / state["key"] += delta assignment,
    return (key, value). Otherwise return None. Flags non-literal keys."""
    target = None
    if isinstance(stmt, ast.Assign) and len(stmt.targets) == 1:
        target = stmt.targets[0]
    elif isinstance(stmt, ast.AugAssign):
        target = stmt.target
    if not (isinstance(target, ast.Subscript) and isinstance(target.value, ast.Name) and target.value.id in ("state", "s")):
        return None
    key = slot_key(target.slice)
    if key is None:
        UNHANDLED.append("state assignment with a non-literal key")
        return None
    if isinstance(stmt, ast.AugAssign):
        delta = stmt.value.value if isinstance(stmt.value, ast.Constant) else 1
        return (key, delta)
    delta = running_total_delta(stmt.value, key)
    if delta is not None:
        return (key, delta)
    value = const_str(stmt.value)
    if value is None:
        UNHANDLED.append(f"state assignment to {key!r} has a non-literal value")
        return None
    return (key, value)


def extract_effects(stmts):
    """Walk a choice branch's body, returning (beats, effects)."""
    beats = []
    effects = {}
    for stmt in stmts:
        if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Call):
            beat = call_to_beat(stmt.value)
            if beat:
                beats.append(beat)
            continue
        effect = state_effect_from_stmt(stmt)
        if effect is not None:
            key, value = effect
            if isinstance(stmt, ast.AugAssign):
                effects[key] = effects.get(key, 0) + value
            else:
                effects[key] = value
        # pause() and anything else inside a branch is intentionally ignored
    return beats, effects


def scene_to_beats(func):
    beats = []
    stmts = list(func.body)
    i = 0
    while i < len(stmts):
        stmt = stmts[i]

        if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Call):
            beat = call_to_beat(stmt.value)
            if beat:
                beats.append(beat)
            i += 1
            continue

        if (
            isinstance(stmt, ast.Assign)
            and isinstance(stmt.value, ast.Call)
            and isinstance(stmt.value.func, ast.Name)
            and stmt.value.func.id == "choice"
        ):
            prompt = call_text_arg(stmt.value, 0)
            if (
                len(stmt.value.args) < 2
                or not isinstance(stmt.value.args[1], ast.List)
                or not all(isinstance(el, ast.Tuple) and len(el.elts) >= 2 for el in stmt.value.args[1].elts)
            ):
                UNHANDLED.append("choice() options are not a list of 2-tuples")
                i += 1
                continue
            options = [
                (const_str(el.elts[0]), const_str(el.elts[1]))
                for el in stmt.value.args[1].elts
            ]
            next_stmt = stmts[i + 1] if i + 1 < len(stmts) else None
            if not isinstance(next_stmt, ast.If) or len(options) != 2:
                UNHANDLED.append("choice() not followed by a two-branch if/else")
                i += 1
                continue
            body_a, effects_a = extract_effects(next_stmt.body)
            body_b, effects_b = extract_effects(next_stmt.orelse)
            beats.append({
                "type": "choice",
                "prompt": prompt,
                "options": [
                    {"key": options[0][0], "label": options[0][1], "effects": effects_a, "beats": body_a},
                    {"key": options[1][0], "label": options[1][1], "effects": effects_b, "beats": body_b},
                ],
            })
            i += 2
            continue

        if (
            isinstance(stmt, ast.Assign)
            and isinstance(stmt.value, ast.Call)
            and isinstance(stmt.value.func, ast.Name)
            and stmt.value.func.id == "name_the_crew"
        ):
            if len(stmt.value.args) < 2:
                UNHANDLED.append("call to name_the_crew() has too few arguments")
                i += 1
                continue
            prompt = call_text_arg(stmt.value, 0)
            default = call_text_arg(stmt.value, 1)
            beats.append({"type": "freeText", "prompt": prompt, "stateKey": "crew_name", "default": default})
            i += 2  # skip the following `s["crew_name"] = name` — already modeled
            continue

        effect = state_effect_from_stmt(stmt)
        if effect is not None:
            key, value = effect
            beats.append({"type": "effect", "effects": {key: value}})
            i += 1
            continue

        i += 1

    return beats


def chapter_scene_order(tree):
    main_func = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "main")
    order = []
    for stmt in main_func.body:
        if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Call):
            call = stmt.value
            if isinstance(call.func, ast.Name) and call.func.id.startswith("scene"):
                order.append(call.func.id)
    return order


def convert_chapter(path, chapter_number, title):
    with open(path) as f:
        tree = ast.parse(f.read())
    scenes = {n.name: n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name.startswith("scene")}
    beats = []
    for name in chapter_scene_order(tree):
        beats.extend(scene_to_beats(scenes[name]))
    return {"number": chapter_number, "title": title, "beats": beats}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: convert_story.py <games-dir> [output.json]", file=sys.stderr)
        sys.exit(1)

    games_dir = sys.argv[1]
    chapters = [
        (f"{games_dir}/shorestorm.py", 1, "Three Families, One House"),
        (f"{games_dir}/shorestorm_ch2.py", 2, "Across the Bridge"),
        (f"{games_dir}/shorestorm_ch3.py", 3, "The Road Back"),
        (f"{games_dir}/shorestorm_ch4.py", 4, "Low Tide"),
    ]

    story = {
        "storyId": "shorestorm",
        "title": "The Cousins of Brigantine",
        "cast": [
            {"name": "Clementine", "accountSlug": "clementine", "color": "#87af87", "role": "earth & healing", "powerStateKey": "clementine_power", "revealChapter": None, "revealedPower": None},
            {"name": "Ivory", "accountSlug": "ivory", "color": "#afffff", "role": "wind", "powerStateKey": "ivory_power", "revealChapter": None, "revealedPower": None},
            {"name": "Olivia", "accountSlug": "olivia", "color": "#d7afff", "role": "air & mist", "powerStateKey": "olivia_power", "revealChapter": None, "revealedPower": None},
            {"name": "Laine", "accountSlug": "laine", "color": "#5fafff", "role": "water", "powerStateKey": "laine_power", "revealChapter": None, "revealedPower": None},
            {"name": "Theo", "accountSlug": "theo", "color": "#d75f00", "role": "monster-truck expert", "powerStateKey": None, "revealChapter": None, "revealedPower": None},
            {"name": "Wesley", "accountSlug": "wesley", "color": "#8787af", "role": "monster-truck expert", "powerStateKey": None, "revealChapter": None, "revealedPower": None},
            {"name": "Henry", "accountSlug": "henry", "color": "#c14f6a", "role": "quiet", "powerStateKey": None, "revealChapter": 3, "revealedPower": "calm & hush"},
            {"name": "Elijah", "accountSlug": "elijah", "color": "#ffd787", "role": "glow", "powerStateKey": None, "revealChapter": 3, "revealedPower": "light & glow"},
        ],
        "chapters": [convert_chapter(path, number, title) for path, number, title in chapters],
    }

    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    output = json.dumps(story, indent=2)
    if output_path:
        with open(output_path, "w") as f:
            f.write(output)
    else:
        print(output)

    if UNHANDLED:
        print(f"\n{len(UNHANDLED)} construct(s) need manual review:", file=sys.stderr)
        for msg in UNHANDLED:
            print(f"  - {msg}", file=sys.stderr)
