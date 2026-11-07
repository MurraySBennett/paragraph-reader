import base64
import re
import runpy
import tempfile
import unittest
from pathlib import Path


class CliTest(unittest.TestCase):
    def test_bootstrapped_page_preserves_unicode_and_script_like_text(self):
        cli = runpy.run_path(str(Path(__file__).parents[1] / 'bin' / 'paragraph-reader'))
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'essay.txt'
            original = 'A café paragraph.\n\n</script> is text, not markup.'
            page = cli['build_page'](source, original)
            html = page.read_text(encoding='utf-8')
            match = re.search(r'id="boot-text"[^>]*data-encoding="base64"[^>]*>([^<]+)</script>', html)
            self.assertIsNotNone(match)
            self.assertEqual(base64.b64decode(match.group(1)).decode('utf-8'), original)
            self.assertIn('<style>', html)
            self.assertEqual(page, cli['build_page'](source, original))
            self.assertEqual(page.stat().st_mode & 0o777, 0o600)
            page.unlink()


if __name__ == '__main__':
    unittest.main()
