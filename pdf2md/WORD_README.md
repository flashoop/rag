# Word to Markdown Converter

Convert Microsoft Word documents (.docx, .doc) to Markdown format with multiple conversion methods.

## Features

✅ **Multiple Conversion Methods**
- `pandoc` - Best quality (requires system installation)
- `mammoth` - Pure Python, good balance of quality and ease
- `python-docx` - Excellent table handling

✅ **Batch Processing**
- Convert single files or entire directories
- Recursive directory scanning
- Automatic handling of temporary files (~$)

✅ **Formatting Preservation**
- Headers and subheaders
- **Bold** and *italic* text
- ~~Strikethrough~~
- Tables
- Lists (bullets and numbered)
- Paragraphs

✅ **Easy to Use**
- Simple command-line interface
- Python API
- Error handling

## Quick Start

### Installation

```bash
# Basic installation (Pure Python - Recommended)
pip install mammoth

# Alternative methods
pip install python-docx markdownify

# Best quality (requires system installation)
# macOS:
brew install pandoc

# Ubuntu/Debian:
sudo apt-get install pandoc

# Windows:
# Download from: https://pandoc.org/installing.html
```

### Basic Usage

#### Simple Script (Easiest)

```bash
# Convert single file
python simple_word2md.py document.docx

# Convert all Word files in folder
python simple_word2md.py word_folder/

# Specify output folder
python simple_word2md.py word_folder/ -o markdown_folder/
```

#### Advanced Script (More Options)

```bash
# Convert single file
python word_to_markdown.py input.docx output.md

# Convert folder
python word_to_markdown.py input_folder/ output_folder/

# Convert with specific method
python word_to_markdown.py input_folder/ output_folder/ --method pandoc

# Recursive conversion
python word_to_markdown.py input_folder/ output_folder/ --recursive

# Verbose output
python word_to_markdown.py input_folder/ output_folder/ --verbose
```

#### Universal Converter (PDF + Word + HTML)

```bash
# Convert any supported file type
python universal_converter.py document.docx output.md
python universal_converter.py document.pdf output.md
python universal_converter.py page.html output.md

# Convert entire folder (all types)
python universal_converter.py documents/ markdown/ --recursive
```

## Usage Examples

### Example 1: Convert Single File

```bash
python simple_word2md.py report.docx
# Output: report.md (same directory)
```

### Example 2: Batch Convert Folder

```bash
# Input structure:
# documents/
#   ├── report1.docx
#   ├── report2.docx
#   └── summary.doc

python simple_word2md.py documents/ -o markdown/

# Output structure:
# markdown/
#   ├── report1.md
#   ├── report2.md
#   └── summary.md
```

### Example 3: Recursive Conversion

```bash
# Input structure:
# docs/
#   ├── 2024/
#   │   ├── q1.docx
#   │   └── q2.docx
#   └── 2025/
#       └── q1.docx

python word_to_markdown.py docs/ markdown/ --recursive

# Output structure:
# markdown/
#   ├── 2024/
#   │   ├── q1.md
#   │   └── q2.md
#   └── 2025/
#       └── q1.md
```

### Example 4: Choose Specific Method

```bash
# Use pandoc (best quality)
python word_to_markdown.py input.docx output.md --method pandoc

# Use mammoth (pure Python)
python word_to_markdown.py input.docx output.md --method mammoth

# Use python-docx (good for tables)
python word_to_markdown.py input.docx output.md --method python-docx

# Auto-detect best method
python word_to_markdown.py input.docx output.md --method auto
```

## Conversion Methods Comparison

| Method | Quality | Tables | Images | Speed | Dependencies |
|--------|---------|--------|--------|-------|--------------|
| **pandoc** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | System install |
| **mammoth** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | Pure Python |
| **python-docx** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | Pure Python |

### Detailed Comparison

#### pandoc (Best Overall)
- ✅ Highest quality conversion
- ✅ Preserves all formatting
- ✅ Excellent table support
- ✅ Handles images and embedded content
- ❌ Requires system installation
- ❌ External dependency

#### mammoth (Recommended for Most Users)
- ✅ Pure Python (easy installation)
- ✅ Good quality
- ✅ Handles most formatting
- ✅ Fast processing
- ⚠️ Some advanced formatting may be lost
- ✅ No system dependencies

#### python-docx (Good for Tables)
- ✅ Pure Python
- ✅ Excellent table extraction
- ✅ Good paragraph handling
- ✅ Very fast
- ⚠️ Basic formatting only
- ❌ Limited inline formatting

## Output Format

The converter generates clean Markdown:

**Input (Word document):**
```
Title: My Report
------------------

Introduction

This is a sample paragraph with bold and italic text.

- Bullet point 1
- Bullet point 2

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
```

**Output (Markdown):**
```markdown
# My Report

*Converted from: report.docx*

---

## Introduction

This is a sample paragraph with **bold** and *italic* text.

- Bullet point 1
- Bullet point 2

| Column 1 | Column 2 |
| --- | --- |
| Data 1 | Data 2 |
```

## Python API Usage

### Simple Conversion

```python
from simple_word2md import convert_docx_to_markdown

# Convert single file
output_path = convert_docx_to_markdown('document.docx')
print(f"Converted to: {output_path}")

# Convert with custom output
convert_docx_to_markdown('document.docx', 'custom_output.md')
```

### Batch Conversion

```python
from simple_word2md import convert_folder

# Convert all DOCX files in folder
output_files = convert_folder('word_folder/', 'markdown_folder/')
print(f"Converted {len(output_files)} files")
```

### Advanced API

```python
from word_to_markdown import WordToMarkdownConverter

# Initialize converter with specific method
converter = WordToMarkdownConverter(method='mammoth')

# Convert single file
markdown_text = converter.convert('document.docx')

# Save to file
converter.convert_file('document.docx', 'output.md')

# Batch conversion
output_files = converter.convert_batch(
    'input_folder/',
    'output_folder/',
    recursive=True
)
```

### Universal Converter API

```python
from universal_converter import UniversalConverter

converter = UniversalConverter()

# Convert any supported format
converter.convert_file('document.docx', 'output.md')
converter.convert_file('document.pdf', 'output.md')
converter.convert_file('page.html', 'output.md')

# Batch conversion (all types)
output_files = converter.convert_batch(
    'documents/',
    'markdown/',
    recursive=True
)
```

## Troubleshooting

### Issue 1: Import Error

```
ImportError: mammoth not installed
```

**Solution:**
```bash
pip install mammoth
# or
pip install -r requirements_word.txt
```

### Issue 2: Pandoc Not Found

```
Error: pandoc not available
```

**Solution:**
```bash
# macOS
brew install pandoc

# Ubuntu/Debian
sudo apt-get install pandoc

# Windows
# Download from: https://pandoc.org/installing.html
```

### Issue 3: Poor Quality Output

**For complex documents:** Use pandoc
```bash
# Install pandoc first, then:
python word_to_markdown.py document.docx --method pandoc
```

**For tables:** Use python-docx
```bash
pip install python-docx markdownify
python word_to_markdown.py document.docx --method python-docx
```

### Issue 4: .doc Files (Old Format)

Old `.doc` format (Word 97-2003) requires conversion first:

**Option 1:** Convert to .docx in Word
- Open in Word → Save As → Choose .docx format

**Option 2:** Use LibreOffice
```bash
# Convert .doc to .docx
libreoffice --headless --convert-to docx document.doc

# Then convert to markdown
python word_to_markdown.py document.docx
```

### Issue 5: Temporary Files Error

```
Error: Failed to convert ~$document.docx
```

**Cause:** Word creates temporary files (starting with `~$`) when documents are open

**Solution:**
- Close all Word documents before conversion
- The script automatically skips temporary files

## Advanced Features

### 1. Custom Post-Processing

```python
from word_to_markdown import WordToMarkdownConverter
import re

converter = WordToMarkdownConverter()
markdown = converter.convert('document.docx')

# Remove excessive blank lines
markdown = re.sub(r'\n{3,}', '\n\n', markdown)

# Replace specific terms
markdown = markdown.replace('Company X', 'Your Company')

# Save processed content
with open('processed.md', 'w') as f:
    f.write(markdown)
```

### 2. Extract Specific Sections

```python
from word_to_markdown import WordToMarkdownConverter

converter = WordToMarkdownConverter()
markdown = converter.convert('document.docx')

# Split by headers
sections = markdown.split('## ')

for section in sections:
    if 'Executive Summary' in section:
        with open('summary.md', 'w') as f:
            f.write('## ' + section)
        break
```

### 3. Batch Processing with Progress

```python
from word_to_markdown import WordToMarkdownConverter
from pathlib import Path
from tqdm import tqdm  # pip install tqdm

converter = WordToMarkdownConverter()
word_files = list(Path('documents/').glob('*.docx'))

for word_file in tqdm(word_files, desc="Converting"):
    try:
        converter.convert_file(str(word_file))
    except Exception as e:
        print(f"Failed: {word_file.name} - {e}")
```

## Integration Examples

### 1. Integration with RAG System

```python
from word_to_markdown import WordToMarkdownConverter
from rag_system import ingest_documents

converter = WordToMarkdownConverter()

# Convert Word documents to markdown
converter.convert_batch('documents/', 'markdown/')

# Ingest into RAG system
ingest_documents('markdown/')
```

### 2. Automated Document Processing Pipeline

```bash
#!/bin/bash
# process_documents.sh

INPUT_DIR="incoming_docs"
MARKDOWN_DIR="markdown_output"
ARCHIVE_DIR="processed_docs"

# Convert to markdown
python word_to_markdown.py $INPUT_DIR $MARKDOWN_DIR

# Archive originals
mv $INPUT_DIR/*.docx $ARCHIVE_DIR/

# Trigger downstream processing
python process_markdown.py $MARKDOWN_DIR
```

### 3. Web Service

```python
from flask import Flask, request, send_file
from word_to_markdown import WordToMarkdownConverter
import tempfile

app = Flask(__name__)
converter = WordToMarkdownConverter()

@app.route('/convert', methods=['POST'])
def convert_word():
    docx_file = request.files['docx']

    with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
        docx_file.save(tmp.name)
        output_path = converter.convert_file(tmp.name)
        return send_file(output_path, mimetype='text/markdown')

app.run()
```

## File Structure

```
pdf2md/
├── README.md                  # PDF converter README
├── WORD_README.md            # This file (Word converter)
├── requirements.txt           # PDF dependencies
├── requirements_word.txt      # Word dependencies
├── pdf_to_markdown.py        # PDF converter
├── word_to_markdown.py       # Word converter (advanced)
├── simple_word2md.py         # Word converter (simple)
├── universal_converter.py    # Handles all formats
├── simple_pdf2md.py          # PDF converter (simple)
└── example_usage.py          # Usage examples
```

## Dependencies

### Core Dependencies

```
mammoth>=1.6.0           # Pure Python Word converter
python-docx>=1.1.0       # Document structure
markdownify>=0.11.6      # HTML to Markdown
```

### Optional Dependencies

```
tqdm>=4.66.0             # Progress bars
pandoc (system)          # Best quality (external)
```

## System Requirements

- **Python**: 3.7 or higher
- **Operating System**: Windows, macOS, Linux
- **Memory**: 256MB minimum
- **Disk Space**: Depends on document size

## Comparison: Word vs PDF Conversion

| Aspect | Word Conversion | PDF Conversion |
|--------|----------------|----------------|
| **Accuracy** | High (source format) | Medium (rendered format) |
| **Speed** | Very Fast | Medium |
| **Tables** | Excellent | Good |
| **Formatting** | Native | Reconstructed |
| **Images** | Embedded | Extracted |
| **Setup** | Pure Python | Requires libs |

### When to Use Word Converter

✅ Source documents are .docx
✅ Need perfect table extraction
✅ Want fastest processing
✅ Documents have complex formatting

### When to Use PDF Converter

✅ Only PDF version available
✅ Scanned documents (with OCR)
✅ Need to preserve exact layout
✅ Working with mixed formats

## FAQ

### Q: Which method should I use?

**A:** For most users, use `mammoth` (default). It's pure Python and provides good quality.

For best quality, install `pandoc` and use `--method pandoc`.

### Q: Does it work with .doc files (old format)?

**A:** Limited support. Best to convert .doc to .docx first using Word or LibreOffice.

### Q: Can it extract images?

**A:** Yes, but you need to specify image extraction in the code. Mammoth and pandoc support this.

### Q: How do I handle password-protected documents?

**A:** Remove password protection in Word first. The converters don't handle encrypted files.

### Q: Does it preserve all formatting?

**A:** Markdown has limited formatting. Complex Word formatting (colors, fonts, spacing) won't be preserved. Basic formatting (bold, italic, headers, tables) works well.

### Q: Can I convert to other formats?

**A:** Yes! Once in Markdown, use `pandoc` to convert to HTML, PDF, DOCX, etc:
```bash
pandoc output.md -o output.html
pandoc output.md -o output.pdf
```

## License

MIT License - Feel free to use in any project

## Support

For issues:
1. Check [Troubleshooting](#troubleshooting)
2. Verify document opens in Word
3. Try different conversion methods
4. Check if file is actually .docx (not renamed .doc)

---

**Happy Converting! 📄 → 📝**
