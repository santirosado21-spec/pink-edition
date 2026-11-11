import unittest
from editorial_reference import approved_directions


class ReferenceScopeTests(unittest.TestCase):
    def setUp(self):
        self.brief = {'preferences': {'editorial': {'version': 1, 'referenceAspects': ['resources']}}}
        self.pattern = {'adaptation': 'semantic-icons', 'sourceSha256': 'a' * 64,
                        'evidenceSeconds': [12.2, 13.6], 'implementation': 'available', 'userApproval': 'liked'}

    def test_only_liked_selected_evidenced_patterns(self):
        other = {**self.pattern, 'adaptation': 'headline-scenes'}
        self.assertEqual(approved_directions(self.brief, snapshot={'patterns': [self.pattern, other]})[0]['aspect'], 'resources')
        self.assertEqual(len(approved_directions(self.brief, snapshot={'patterns': [self.pattern, other]})), 1)
        for override in ({'userApproval': 'pending'}, {'implementation': 'not-implemented'},
                         {'evidenceSeconds': []}, {'evidenceSeconds': [float('nan')]}, {'sourceSha256': 'other'},
                         {'sourceSha256': True}, {'evidenceSeconds': True}):
            self.assertEqual(approved_directions(self.brief, snapshot={'patterns': [{**self.pattern, **override}]}), [])

    def test_legacy_and_unselected_do_not_inherit_new_reference(self):
        self.assertEqual(approved_directions({'preferences': {}}, snapshot={'patterns': [self.pattern]}), [])
        self.brief['preferences']['editorial']['referenceAspects'] = []
        self.assertEqual(approved_directions(self.brief, snapshot={'patterns': [self.pattern]}), [])


if __name__ == '__main__':
    unittest.main()
