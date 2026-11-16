import base64
import re
import runpy
import tempfile
import unittest
from pathlib import Path


class CliTest(unittest.TestCase):
    def test_tex_items_keep_their_text(self):
        cli = runpy.run_path(str(Path(__file__).parents[1] / 'bin' / 'paragraph-reader'))
        text = cli['strip_tex'](r'\begin{itemize}\item One\item Two\end{itemize}' + '\n\nAfter list.')
        self.assertIn('One', text)
        self.assertIn('Two', text)
        self.assertIn('After list.', text)

    def test_line_numbered_manuscript_splits_on_first_line_indent(self):
        cli = runpy.run_path(str(Path(__file__).parents[1] / 'bin' / 'paragraph-reader'))
        page_one = '\n'.join([
            ' 1   LEARNING IN OLDER AGE                             7',
            ' 2',
            ' 3          The domain structure of later life learning can be organized in',
            ' 4',
            ' 5   several ways, with a broad distinction between kinds of knowledge.',
            ' 6',
            ' 7          Measures that collapse across domains may obscure the specific',
            ' 8',
            ' 9   situations in which older adults feel competent.',
        ])
        page_two = '\n'.join([
            ' 1   LEARNING IN OLDER AGE                             8',
            ' 2',
            ' 3   They may still capture a general orientation toward learning.',
        ])
        paragraphs = cli['layout_paragraphs'](page_one + '\f' + page_two).split('\n\n')
        self.assertEqual(len(paragraphs), 2)
        self.assertTrue(paragraphs[0].startswith('The domain structure'))
        self.assertTrue(paragraphs[0].endswith('kinds of knowledge.'))
        self.assertIn('feel competent. They may still capture', paragraphs[1])
        self.assertNotIn('LEARNING IN OLDER AGE', '\n\n'.join(paragraphs))

    def test_plain_pdf_text_keeps_blank_line_paragraphs(self):
        cli = runpy.run_path(str(Path(__file__).parents[1] / 'bin' / 'paragraph-reader'))
        text = 'A first paragraph of ordinary text.\n\n2024 was the reference year.\nIt continues here.'
        self.assertEqual(
            cli['layout_paragraphs'](text).split('\n\n'),
            ['A first paragraph of ordinary text.', '2024 was the reference year. It continues here.'],
        )

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

    def test_tex_bootstrap_keeps_format_commands_for_browser_parser(self):
        cli = runpy.run_path(str(Path(__file__).parents[1] / 'bin' / 'paragraph-reader'))
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'methods.tex'
            original = r'\section{Methods} A \textbf{bold} result.'
            source.write_text(original, encoding='utf-8')
            self.assertEqual(cli['load_text'](source), original)
            page = cli['build_page'](source, original)
            html = page.read_text(encoding='utf-8')
            self.assertIn('data-prepared="false"', html)
            match = re.search(r'id="boot-text"[^>]*data-encoding="base64"[^>]*>([^<]+)</script>', html)
            self.assertEqual(base64.b64decode(match.group(1)).decode('utf-8'), original)
            page.unlink()


if __name__ == '__main__':
    unittest.main()
