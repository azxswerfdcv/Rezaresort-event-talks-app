import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Cache for storing feed data
cache = {
    'updates': [],
    'last_updated': None
}

def html_to_tweet_text(html_str):
    """Converts HTML content to clean plain text suitable for Tweeting."""
    # Convert list items to bullet points with line breaks
    html_str = re.sub(r'<li>(.*?)</li>', r'- \1\n', html_str)
    
    # Format links: <a href="url">text</a> -> text (url)
    processed = re.sub(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', r'\2 (\1)', html_str)
    
    # Strip remaining HTML tags
    clean = re.sub(r'<[^>]+>', ' ', processed)
    
    # Unescape HTML entities
    html_entities = {
        '&lt;': '<',
        '&gt;': '>',
        '&amp;': '&',
        '&quot;': '"',
        '&apos;': "'",
        '&#39;': "'",
        '&nbsp;': ' '
    }
    for entity, char in html_entities.items():
        clean = clean.replace(entity, char)
        
    # Format lines, collapse whitespace
    lines = []
    for line in clean.split('\n'):
        line = re.sub(r'[ \t]+', ' ', line).strip()
        if line:
            lines.append(line)
            
    return "\n".join(lines).strip()

def fetch_and_parse_release_notes():
    """Fetches the XML feed and parses it into a list of individual updates."""
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    
    # Configure request with a User-Agent to avoid potential blockages
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = root.findall('atom:entry', ns)
    parsed_updates = []
    
    for entry in entries:
        title = entry.find('atom:title', ns).text  # Date, e.g. "June 16, 2026"
        entry_id = entry.find('atom:id', ns).text  # Unique feed ID
        updated_raw = entry.find('atom:updated', ns).text  # ISO format timestamp
        
        content_elem = entry.find('atom:content', ns)
        if content_elem is None or not content_elem.text:
            continue
        content_html = content_elem.text
        
        # Split by h3 to separate distinct updates (features, issues, announcements, etc.)
        parts = re.split(r'<h3>(.*?)</h3>', content_html)
        if len(parts) <= 1:
            # No h3 tags found; treat as a single general update
            clean_text = html_to_tweet_text(content_html)
            update_id = f"{entry_id}_0"
            parsed_updates.append({
                'id': update_id,
                'date': title,
                'updated_raw': updated_raw,
                'category': 'General',
                'html_content': content_html.strip(),
                'tweet_text': clean_text
            })
        else:
            # Parts alternates: [text_before_first_h3, category1, body1, category2, body2, ...]
            for idx in range(1, len(parts), 2):
                category = parts[idx].strip()
                body = parts[idx+1] if idx+1 < len(parts) else ""
                
                if not body.strip():
                    continue
                
                clean_text = html_to_tweet_text(body)
                update_id = f"{entry_id}_{idx // 2}"
                
                parsed_updates.append({
                    'id': update_id,
                    'date': title,
                    'updated_raw': updated_raw,
                    'category': category,
                    'html_content': body.strip(),
                    'tweet_text': clean_text
                })
                
    return parsed_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if force_refresh or not cache['updates'] or cache['last_updated'] is None:
        try:
            updates = fetch_and_parse_release_notes()
            cache['updates'] = updates
            cache['last_updated'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            return jsonify({
                'status': 'success',
                'last_updated': cache['last_updated'],
                'updates': cache['updates']
            })
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e),
                'last_updated': cache['last_updated'] or 'Never'
            }), 500
            
    return jsonify({
        'status': 'success',
        'last_updated': cache['last_updated'],
        'updates': cache['updates']
    })

if __name__ == '__main__':
    # Run Flask on port 5000
    app.run(debug=True, host='0.0.0.0', port=5000)
