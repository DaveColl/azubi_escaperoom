#!/usr/bin/env python3
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urldefrag
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = [ROOT / 'index.html', *sorted((ROOT / 'pages').glob('*.html'))]
REQUIRED_FILES = [
    ROOT / 'index.html',
    ROOT / 'styles.css',
    ROOT / 'script.js',
    ROOT / 'pages' / 'team-1.html',
    ROOT / 'pages' / 'team-2.html',
    ROOT / 'pages' / 'team-3.html',
    ROOT / 'pages' / 'phone-team-1.html',
    ROOT / 'pages' / 'phone-team-2.html',
    ROOT / 'pages' / 'phone-team-3.html',
    ROOT / 'pages' / 'victory.html',
]


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = set()
        self.text = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        for attr in ('href', 'src'):
            if attr in attrs:
                self.links.append((tag, attr, attrs[attr]))

    def handle_data(self, data):
        self.text.append(data)


def fail(message):
    print(f'FAIL: {message}')
    sys.exit(1)


def assert_exists(path):
    if not path.exists():
        fail(f'Missing required file: {path.relative_to(ROOT)}')


def local_target_exists(source_file, value):
    value = urldefrag(value)[0]
    if not value or value.startswith(('http://', 'https://', 'mailto:', 'tel:', 'javascript:')):
        return True
    target = (source_file.parent / unquote(value)).resolve()
    try:
        target.relative_to(ROOT)
    except ValueError:
        fail(f'{source_file.relative_to(ROOT)} links outside project: {value}')
    return target.exists()


def test_required_files():
    for path in REQUIRED_FILES:
        assert_exists(path)


def test_html_links_and_ids():
    for html_file in HTML_FILES:
        parser = LinkParser()
        parser.feed(html_file.read_text(encoding='utf-8'))
        for tag, attr, value in parser.links:
            if not local_target_exists(html_file, value):
                fail(f'Broken {attr} in {html_file.relative_to(ROOT)}: {value}')

        if html_file.name == 'index.html':
            for required_id in {'passwordForm', 'passwordInput', 'passwordFeedback', 'terminalPanel', 'unlockTeam'}:
                if required_id not in parser.ids:
                    fail(f'index.html missing #{required_id}')
            if 'asset-strip' in html_file.read_text(encoding='utf-8'):
                fail('index.html still contains first-page preview asset strip')
        elif html_file.name.startswith('team-'):
            html = html_file.read_text(encoding='utf-8')
            if 'data-qr-code' not in html:
                fail(f'{html_file.relative_to(ROOT)} missing generated QR canvas')
            if 'data-final-password-form' not in html:
                fail(f'{html_file.relative_to(ROOT)} missing final password form')
        elif html_file.name.startswith('phone-team-'):
            html = html_file.read_text(encoding='utf-8')
            if 'data-final-password-form' not in html:
                fail(f'{html_file.relative_to(ROOT)} missing mobile final password form')
        elif html_file.name == 'victory.html':
            if 'Krise gelöst' not in ' '.join(parser.text):
                fail('victory.html missing crisis resolved message')


def test_css_asset_urls():
    css_file = ROOT / 'styles.css'
    css = css_file.read_text(encoding='utf-8')
    for value in re.findall(r'url\(["\']?([^"\')]+)["\']?\)', css):
        if value.startswith(('data:', 'http://', 'https://')):
            continue
        target = (css_file.parent / unquote(value)).resolve()
        if not target.exists():
            fail(f'Broken CSS asset URL: {value}')


def test_password_routes():
    script = (ROOT / 'script.js').read_text(encoding='utf-8')
    expected = {
        "'team1', 'pages/team-1.html'",
        "'team2', 'pages/team-2.html'",
        "'team3', 'pages/team-3.html'",
    }
    for route in expected:
        if route not in script:
            fail(f'Missing password route: {route}')
    if 'normalizePassword' not in script:
        fail('script.js missing normalizePassword')
    for token in ['TEAM_CONFIG', 'wireQrCodes', 'drawQrCode', 'wireFinalPasswordForms', 'victory.html']:
        if token not in script:
            fail(f'script.js missing {token}')
    for password in ['krise1', 'krise2', 'krise3']:
        if password not in script:
            fail(f'script.js missing final password: {password}')


def test_docx_tasks_present():
    task_text = ' '.join(path.read_text(encoding='utf-8') for path in HTML_FILES)
    for phrase in ['gleichzeitig springen', 'Aareon', '3 Dinge im Raum']:
        if phrase not in task_text:
            fail(f'Missing DOCX-derived task phrase: {phrase}')


def main():
    test_required_files()
    test_html_links_and_ids()
    test_css_asset_urls()
    test_password_routes()
    test_docx_tasks_present()
    print('PASS: static Escape Office prototype looks consistent.')


if __name__ == '__main__':
    main()

