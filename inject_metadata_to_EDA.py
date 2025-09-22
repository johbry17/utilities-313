'''Script to inject metadata (title, description, author, favicon) into utilities_313_EDA.html.'''

from bs4 import BeautifulSoup
import sys
fn_in = 'utilities_313_EDA.html'
fn_out = fn_in  # overwrite original file

# Load metadata you want to insert
meta = {
    'title': 'Utilities 313 - Exploratory Data Analysis',
    'description': 'An exploratory data analysis project for utilities consumption in a shared living space.',
    'author': 'Bryan C. Johns',
    'favicon': 'static/images/favicon.ico'
}

html = open(fn_in, 'r', encoding='utf8').read()
soup = BeautifulSoup(html, 'html.parser')
if soup.head is None:
    soup.html.insert(0, soup.new_tag('head'))

# Insert/replace title
if soup.head.title:
    soup.head.title.string = meta['title']
else:
    t = soup.new_tag('title')
    t.string = meta['title']
    soup.head.insert(0, t)

# Add description and author meta tags (ensure only single instance)
for name in ('description','author'):
    tag = soup.head.find('meta', attrs={'name': name})
    if tag:
        tag['content'] = meta[name]
    else:
        tag = soup.new_tag('meta', attrs={'name': name, 'content': meta[name]})
        soup.head.append(tag)

# Add favicon
link = soup.head.find('link', rel='icon')
if link:
    link['href'] = meta['favicon']
else:
    link_tag = soup.new_tag('link', attrs={'rel': 'icon', 'href': meta['favicon'], 'type': "image/x-icon"})
    soup.head.append(link_tag)

open(fn_out, 'w', encoding='utf8').write(str(soup))
print('Wrote', fn_out)
