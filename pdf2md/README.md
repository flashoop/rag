# PDF to Markdown Batch Converter

A powerful Python tool to batch convert PDF files to Markdown format with multiple conversion methods.

## Features

✅ **Multiple Conversion Methods**
- `pymupdf4llm` - Best quality, preserves structure (recommended)
- `pdfplumber` - Excellent for tables and complex layouts
- `PyPDF2` - Basic text extraction (fallback)

✅ **Batch Processing**
- Convert single files or entire directories
- Recursive directory scanning
- Preserves folder structure

✅ **Smart Conversion**
- Auto-detection of best method
- Fallback on failure
- Table extraction and formatting
- Metadata preservation

✅ **Easy to Use**
- Simple command-line interface
- Progress logging
- Error handling

## Quick Start

### Installation

```bash
# Navigate to pdf2md directory
cd pdf2md

# Install dependencies (choose one method or all)

# Option 1: Best quality (recommended)
pip install pymupdf4llm

# Option 2: All methods
pip install -r requirements.txt

# Option 3: Specific method
pip install pdfplumber  # Good for tables
pip install PyPDF2      # Basic extraction
```

### Basic Usage

#### Simple Script (Easiest)

```bash
# Convert single file
python simple_pdf2md.py document.pdf

# Convert all PDFs in folder
python simple_pdf2md.py pdf_folder/

# Specify output folder
python simple_pdf2md.py pdf_folder/ -o markdown_folder/
```

#### Advanced Script (More Options)

```bash
# Convert single file
python pdf_to_markdown.py input.pdf output.md

# Convert folder
python pdf_to_markdown.py input_folder/ output_folder/

# Convert with specific method
python pdf_to_markdown.py input_folder/ output_folder/ --method pymupdf

# Recursive conversion
python pdf_to_markdown.py input_folder/ output_folder/ --recursive

# Verbose output
python pdf_to_markdown.py input_folder/ output_folder/ --verbose
```

## Usage Examples

### Example 1: Convert Single File

```bash
python simple_pdf2md.py document.pdf
# Output: document.md (same directory)
```

### Example 2: Batch Convert Folder

```bash
# Input structure:
# pdfs/
#   ├── document1.pdf
#   ├── document2.pdf
#   └── document3.pdf

python simple_pdf2md.py pdfs/ -o markdown/

# Output structure:
# markdown/
#   ├── document1.md
#   ├── document2.md
#   └── document3.md
```

### Example 3: Recursive Conversion

```bash
# Input structure:
# pdfs/
#   ├── 2024/
#   │   ├── report1.pdf
#   │   └── report2.pdf
#   └── 2025/
#       └── report3.pdf

python pdf_to_markdown.py pdfs/ markdown/ --recursive

# Output structure:
# markdown/
#   ├── 2024/
#   │   ├── report1.md
#   │   └── report2.md
#   └── 2025/
#       └── report3.md
```

### Example 4: Choose Specific Method

```bash
# Use pymupdf (best quality)
python pdf_to_markdown.py input.pdf output.md --method pymupdf

# Use pdfplumber (good for tables)
python pdf_to_markdown.py input.pdf output.md --method pdfplumber

# Use PyPDF2 (basic extraction)
python pdf_to_markdown.py input.pdf output.md --method pypdf2

# Auto-detect best method
python pdf_to_markdown.py input.pdf output.md --method auto
```

## Conversion Methods Comparison

| Method | Quality | Tables | Images | Speed | Best For |
|--------|---------|--------|--------|-------|----------|
| **pymupdf4llm** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | General use, structured documents |
| **pdfplumber** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | Documents with complex tables |
| **PyPDF2** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | Simple text-only PDFs |

### Detailed Comparison

#### pymupdf4llm (Recommended)
- ✅ Best overall quality
- ✅ Preserves document structure (headings, lists, etc.)
- ✅ Handles complex layouts
- ✅ Fast processing
- ✅ Good table support
- ❌ Requires pymupdf4llm library

#### pdfplumber
- ✅ Excellent table extraction
- ✅ Precise layout analysis
- ✅ Good for data-heavy documents
- ⚠️ Slower than pymupdf
- ❌ May need post-processing

#### PyPDF2
- ✅ Very fast
- ✅ Simple and reliable
- ✅ Lightweight dependency
- ❌ Basic text extraction only
- ❌ Poor table handling
- ❌ May lose formatting

## Output Format

The converter generates clean Markdown with:

```markdown
# Document Title

*Converted from: document.pdf*

---

## Page 1

[Content from page 1...]

### Tables

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Data 1 | Data 2 | Data 3 |

## Page 2

[Content from page 2...]
```

## Advanced Features

### 1. Custom Output Paths

```bash
# Same directory as input
python simple_pdf2md.py document.pdf

# Specific output file
python pdf_to_markdown.py document.pdf custom_output.md

# Different output directory
python pdf_to_markdown.py pdfs/ markdown_files/
```

### 2. Error Handling

The script automatically:
- Skips files that fail to convert
- Logs errors for debugging
- Continues processing remaining files
- Provides conversion summary

```
✓ Saved: document1.md
✗ Failed to convert document2.pdf: Invalid PDF structure
✓ Saved: document3.md

==================================================
Conversion Complete!
  Success: 2/3
  Failed:  1/3
==================================================
```

### 3. Verbose Logging

```bash
python pdf_to_markdown.py input/ output/ --verbose
```

Output includes:
- Available conversion methods
- Method selection process
- Detailed error messages
- Processing steps

## Python API Usage

### Simple Conversion

```python
from simple_pdf2md import convert_pdf_to_markdown

# Convert single file
output_path = convert_pdf_to_markdown('document.pdf')
print(f"Converted to: {output_path}")

# Convert with custom output
convert_pdf_to_markdown('document.pdf', 'output.md')
```

### Batch Conversion

```python
from simple_pdf2md import convert_folder

# Convert all PDFs in folder
output_files = convert_folder('pdf_folder/', 'markdown_folder/')
print(f"Converted {len(output_files)} files")
```

### Advanced API

```python
from pdf_to_markdown import PDFToMarkdownConverter

# Initialize converter with specific method
converter = PDFToMarkdownConverter(method='pymupdf')

# Convert single file
markdown_text = converter.convert('document.pdf')

# Save to file
converter.convert_file('document.pdf', 'output.md')

# Batch conversion
output_files = converter.convert_batch(
    'input_folder/',
    'output_folder/',
    recursive=True
)
```

### Custom Processing

```python
from pdf_to_markdown import PDFToMarkdownConverter

converter = PDFToMarkdownConverter(method='auto')

# Get markdown content as string
markdown_text = converter.convert('document.pdf')

# Post-process content
markdown_text = markdown_text.replace('old_term', 'new_term')

# Save custom processed content
with open('output.md', 'w', encoding='utf-8') as f:
    f.write(markdown_text)
```

## Troubleshooting

### Issue 1: Import Error

```
ImportError: No PDF libraries found
```

**Solution:**
```bash
# Install at least one library
pip install pymupdf4llm
# or
pip install pdfplumber
# or
pip install PyPDF2
```

### Issue 2: Conversion Fails

```
Error: All conversion methods failed
```

**Solutions:**
1. Check if PDF is corrupted:
   ```bash
   # Try opening in PDF viewer
   open document.pdf  # macOS
   ```

2. Try different method:
   ```bash
   python pdf_to_markdown.py document.pdf --method pdfplumber
   ```

3. Check PDF is not password-protected

### Issue 3: Poor Quality Output

**For tables:** Use pdfplumber method
```bash
python pdf_to_markdown.py document.pdf --method pdfplumber
```

**For structured documents:** Use pymupdf4llm (default)
```bash
python pdf_to_markdown.py document.pdf --method pymupdf
```

**For scanned PDFs:** Add OCR support (see OCR section below)

### Issue 4: Missing Text

Some PDFs have text embedded as images. Solutions:

1. Use OCR (see OCR section)
2. Try different conversion method
3. Check if PDF is actually image-based

## OCR Support (For Scanned PDFs)

For PDFs that are scanned images, you need OCR (Optical Character Recognition):

### Install OCR Dependencies

```bash
# Install Python packages
pip install pytesseract pdf2image Pillow

# Install Tesseract system package
# macOS:
brew install tesseract

# Ubuntu/Debian:
sudo apt-get install tesseract-ocr

# Windows:
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
```

### Use OCR-Enabled Script

```python
# Create ocr_pdf2md.py
import pytesseract
from pdf2image import convert_from_path
from pathlib import Path

def convert_scanned_pdf(pdf_path: str, output_path: str = None):
    """Convert scanned PDF to Markdown using OCR"""

    # Convert PDF to images
    images = convert_from_path(pdf_path)

    markdown_content = []

    for i, image in enumerate(images, 1):
        # Perform OCR
        text = pytesseract.image_to_string(image)
        markdown_content.append(f"\n## Page {i}\n\n{text}")

    # Save to file
    if output_path is None:
        output_path = Path(pdf_path).with_suffix('.md')

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(markdown_content))

    return str(output_path)

# Usage
convert_scanned_pdf('scanned_document.pdf')
```

## Performance Tips

### 1. Batch Processing

For large numbers of files, use batch mode:
```bash
# More efficient than individual conversions
python pdf_to_markdown.py large_folder/ output/ --verbose
```

### 2. Method Selection

- Use `pymupdf` for best quality (default)
- Use `pypdf2` for fastest processing
- Use `pdfplumber` only when tables are important

### 3. Memory Management

For very large PDFs:
```python
# Process page by page instead of all at once
# (Advanced usage - requires custom implementation)
```

## Real-World Examples

### Example 1: Convert Research Papers

```bash
# Papers folder with PDFs
python pdf_to_markdown.py research_papers/ markdown_papers/ --method pymupdf

# Result: Clean markdown suitable for note-taking
```

### Example 2: Extract Data from Reports

```bash
# Financial reports with many tables
python pdf_to_markdown.py reports/ markdown_reports/ --method pdfplumber

# Result: Tables preserved in markdown format
```

### Example 3: Process Invoice Archive

```bash
# Convert all invoices recursively
python pdf_to_markdown.py invoices/ markdown_invoices/ --recursive --method pypdf2

# Result: Fast text extraction from simple PDFs
```

### Example 4: Knowledge Base Migration

```bash
# Convert documentation PDFs to markdown for wiki
python pdf_to_markdown.py documentation/ wiki_content/ --method pymupdf --recursive

# Result: Structured markdown preserving formatting
```

## Integration with Other Tools

### 1. Integration with RAG System

```python
# After conversion, use for RAG ingestion
from pdf_to_markdown import PDFToMarkdownConverter
from rag_system import ingest_documents

converter = PDFToMarkdownConverter()

# Convert PDFs to markdown
converter.convert_batch('pdfs/', 'markdown/')

# Ingest into RAG system
ingest_documents('markdown/')
```

### 2. Automated Workflow

```bash
#!/bin/bash
# auto_convert.sh - Watch folder and auto-convert

INPUT_DIR="incoming_pdfs"
OUTPUT_DIR="markdown_output"

# Convert any new PDFs
python pdf_to_markdown.py $INPUT_DIR $OUTPUT_DIR --method pymupdf

# Trigger downstream processing
python process_markdown.py $OUTPUT_DIR
```

### 3. Web Service Integration

```python
from flask import Flask, request, send_file
from pdf_to_markdown import PDFToMarkdownConverter
import tempfile

app = Flask(__name__)
converter = PDFToMarkdownConverter()

@app.route('/convert', methods=['POST'])
def convert_pdf():
    pdf_file = request.files['pdf']

    # Save temporarily
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
        pdf_file.save(tmp.name)

        # Convert
        output_path = converter.convert_file(tmp.name)

        # Return markdown
        return send_file(output_path, mimetype='text/markdown')

if __name__ == '__main__':
    app.run()
```

## File Structure

```
pdf2md/
├── README.md                  # This file
├── requirements.txt           # Python dependencies
├── simple_pdf2md.py          # Simple converter (easiest)
├── pdf_to_markdown.py        # Advanced converter (full features)
└── requirement.md            # Original requirements
```

## Dependencies

### Core Dependencies

```
pymupdf4llm>=0.0.5    # Best quality conversion
pdfplumber>=0.10.0    # Table extraction
PyPDF2>=3.0.0         # Basic extraction
```

### Optional Dependencies

```
pytesseract>=0.3.10   # OCR support
pdf2image>=1.16.3     # PDF to image conversion
Pillow>=10.0.0        # Image processing
tqdm>=4.66.0          # Progress bars
```

## System Requirements

- **Python**: 3.7 or higher
- **Operating System**: Windows, macOS, Linux
- **Memory**: 512MB minimum (more for large PDFs)
- **Disk Space**: Depends on PDF size

## License

MIT License - Feel free to use in any project

## Contributing

Contributions welcome! Areas for improvement:
- OCR integration
- Image extraction
- Progress bars for batch processing
- GUI interface
- More output formats (HTML, reStructuredText)

## FAQ

### Q: Which method should I use?

**A:** Start with `pymupdf4llm` (default). It provides the best quality for most documents.

### Q: Can it handle password-protected PDFs?

**A:** No, you need to remove password protection first.

### Q: Does it extract images?

**A:** `pymupdf4llm` can extract images. Add `write_images=True` in the code to enable.

### Q: Can it process scanned PDFs?

**A:** Not by default. You need to add OCR support (see OCR section).

### Q: How do I handle large batches?

**A:** Use the batch conversion mode:
```bash
python pdf_to_markdown.py large_folder/ output/ --recursive
```

### Q: Can I customize the output format?

**A:** Yes, modify the code or post-process the markdown output.

### Q: Does it work with non-English PDFs?

**A:** Yes, `pymupdf4llm` handles multiple languages well.

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [Examples](#usage-examples)
3. Check if your PDF is valid
4. Try different conversion methods

## Changelog

### Version 1.0.0
- Initial release
- Multiple conversion methods
- Batch processing support
- Recursive directory scanning
- Table extraction
- Error handling and logging

---

**Happy Converting! 📄 → 📝**
