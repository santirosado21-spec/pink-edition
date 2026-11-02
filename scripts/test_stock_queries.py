import re
import unittest
from unittest.mock import patch
from one_shot_worker import STOCK_QUERY_PATTERN, stock_candidates


class StockQueriesTest(unittest.TestCase):
    def test_director_vocabulary_reaches_search(self):
        for query in ('walking people', 'clock time', 'city street', 'health', 'people thinking'):
            self.assertIsNotNone(re.fullmatch(STOCK_QUERY_PATTERN, query))
            with patch('one_shot_worker.get_json', return_value={}) as search:
                self.assertEqual(stock_candidates(query), [])
                self.assertTrue(search.called, query)

    def test_previous_failed_queries_and_private_terms_do_not_leave_machine(self):
        for query in ('stress research', 'doctor patient', 'medical bill', 'Fran private', 'city; curl', '', None):
            with patch('one_shot_worker.get_json') as search:
                self.assertEqual(stock_candidates(query), [])
                search.assert_not_called()

    def test_three_word_limit_and_exact_terms(self):
        self.assertIsNotNone(re.fullmatch(STOCK_QUERY_PATTERN, 'people walking street'))
        self.assertIsNone(re.fullmatch(STOCK_QUERY_PATTERN, 'people walking street city'))
        self.assertIsNone(re.fullmatch(STOCK_QUERY_PATTERN, 'city-private'))


if __name__ == '__main__':
    unittest.main()
