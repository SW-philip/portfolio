import ast
import textwrap
import unittest

from convert_story import scene_to_beats, UNHANDLED


class ConvertStoryTest(unittest.TestCase):
    def setUp(self):
        UNHANDLED.clear()

    def parse_scene(self, src):
        tree = ast.parse(textwrap.dedent(src))
        return tree.body[0]  # the FunctionDef

    def test_speak_and_beat_become_line_beats(self):
        func = self.parse_scene('''
            def scene_1():
                speak("Hello there.")
                beat("A quieter line.")
        ''')
        beats = scene_to_beats(func)
        self.assertEqual(beats, [
            {"type": "line", "style": "speak", "text": "Hello there."},
            {"type": "line", "style": "beat", "text": "A quieter line."},
        ])

    def test_say_adult_power_and_wait(self):
        func = self.parse_scene('''
            def scene_1():
                say("Wesley", "Watch this.")
                adult("Salt", "Careful now.")
                power("Clementine", "The shell goes warm.")
                wait()
        ''')
        beats = scene_to_beats(func)
        self.assertEqual(beats, [
            {"type": "say", "name": "Wesley", "text": "Watch this."},
            {"type": "adult", "name": "Salt", "text": "Careful now."},
            {"type": "power", "name": "Clementine", "text": "The shell goes warm."},
            {"type": "wait"},
        ])

    def test_pause_is_dropped(self):
        func = self.parse_scene('''
            def scene_1():
                speak("One.")
                pause(0.5)
                speak("Two.")
        ''')
        beats = scene_to_beats(func)
        self.assertEqual(beats, [
            {"type": "line", "style": "speak", "text": "One."},
            {"type": "line", "style": "speak", "text": "Two."},
        ])

    def test_two_option_choice_with_effects_becomes_nested_branches(self):
        func = self.parse_scene('''
            def scene_1():
                key = choice(
                    "What does Clementine do?",
                    [
                        ("A", "Reach for the gull."),
                        ("B", "Dig a trench."),
                    ]
                )
                if key == "A":
                    state["clementine_power"] = "healer"
                    speak("She reaches slowly.")
                    state["team_spark"] += 1
                    wait()
                else:
                    state["clementine_power"] = "builder"
                    speak("She digs fast.")
                    state["team_spark"] += 1
                    wait()
        ''')
        beats = scene_to_beats(func)
        self.assertEqual(len(beats), 1)
        choice_beat = beats[0]
        self.assertEqual(choice_beat["type"], "choice")
        self.assertEqual(choice_beat["prompt"], "What does Clementine do?")
        option_a, option_b = choice_beat["options"]
        self.assertEqual(option_a["key"], "A")
        self.assertEqual(option_a["effects"], {"clementine_power": "healer", "team_spark": 1})
        self.assertEqual(option_a["beats"], [
            {"type": "line", "style": "speak", "text": "She reaches slowly."},
            {"type": "wait"},
        ])
        self.assertEqual(option_b["effects"], {"clementine_power": "builder", "team_spark": 1})

    def test_name_the_crew_becomes_free_text(self):
        func = self.parse_scene('''
            def scene_5():
                name = name_the_crew("What do you call yourselves?", "The Storm Crew")
                s["crew_name"] = name
                speak("Name locked in.")
        ''')
        beats = scene_to_beats(func)
        self.assertEqual(beats, [
            {"type": "freeText", "prompt": "What do you call yourselves?", "stateKey": "crew_name", "default": "The Storm Crew"},
            {"type": "line", "style": "speak", "text": "Name locked in."},
        ])

    def test_fstring_referencing_crew_name_becomes_template(self):
        func = self.parse_scene('''
            def scene_5():
                speak(f'"{name}." Somebody says it out loud.')
        ''')
        beats = scene_to_beats(func)
        self.assertEqual(beats, [
            {"type": "line", "style": "speak", "text": '"{{crew_name}}." Somebody says it out loud.'},
        ])

    def test_fstring_referencing_s_get_crew_name_becomes_template(self):
        func = self.parse_scene('''
            def scene_5():
                slow(f"  {s.get('crew_name', 'The Storm Crew')}, going home.", delay=0.03)
        ''')
        beats = scene_to_beats(func)
        self.assertEqual(beats, [
            {"type": "line", "style": "beat", "text": "{{crew_name}}, going home."},
        ])

    def test_driver_becomes_adult_named_salt(self):
        func = self.parse_scene('''
            def scene_1():
                driver("Crew chief for Riptide. You know anything about trucks?")
        ''')
        beats = scene_to_beats(func)
        self.assertEqual(beats, [
            {"type": "adult", "name": "Salt", "text": "Crew chief for Riptide. You know anything about trucks?"},
        ])

    def test_bare_slow_in_scene_becomes_beat_line_stripped(self):
        func = self.parse_scene('''
            def scene_4():
                slow("\\n    RIPTIDE -- ONE NIGHT ONLY\\n", delay=0.05, color=GOLD)
        ''')
        beats = scene_to_beats(func)
        self.assertEqual(beats, [
            {"type": "line", "style": "beat", "text": "RIPTIDE -- ONE NIGHT ONLY"},
        ])

    def test_unrecognized_call_is_flagged_not_raised(self):
        func = self.parse_scene('''
            def scene_1():
                mystery_call("whatever")
        ''')
        beats = scene_to_beats(func)
        self.assertEqual(beats, [])
        self.assertTrue(any("mystery_call" in msg for msg in UNHANDLED))

    def test_speak_with_no_args_is_flagged_not_raised(self):
        func = self.parse_scene('''
            def scene_1():
                speak()
        ''')
        beats = scene_to_beats(func)
        self.assertEqual(beats, [])
        self.assertTrue(any("speak" in msg and "too few arguments" in msg for msg in UNHANDLED))

    def test_say_with_one_arg_is_flagged_not_raised(self):
        func = self.parse_scene('''
            def scene_1():
                say("Wesley")
        ''')
        beats = scene_to_beats(func)
        self.assertEqual(beats, [])
        self.assertTrue(any("say" in msg and "too few arguments" in msg for msg in UNHANDLED))

    def test_choice_with_malformed_options_is_flagged_not_raised(self):
        func = self.parse_scene('''
            def scene_1():
                key = choice("What now?", ["A", "B"])
                if key == "A":
                    speak("A")
                else:
                    speak("B")
        ''')
        beats = scene_to_beats(func)
        self.assertEqual(beats, [])
        self.assertTrue(any("choice() options" in msg for msg in UNHANDLED))

    def test_name_the_crew_with_one_arg_is_flagged_not_raised(self):
        func = self.parse_scene('''
            def scene_5():
                name = name_the_crew("What do you call yourselves?")
                s["crew_name"] = name
        ''')
        beats = scene_to_beats(func)
        self.assertEqual(beats, [])
        self.assertTrue(any("name_the_crew" in msg and "too few arguments" in msg for msg in UNHANDLED))


if __name__ == "__main__":
    unittest.main()
