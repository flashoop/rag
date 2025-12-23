#!/usr/bin/env python3
"""
Example Usage Scripts for PDF to Markdown Converter

This file demonstrates various ways to use the PDF to Markdown converter.
"""

# ==============================================================================
# Example 1: Simple Single File Conversion
# ==============================================================================

def example_1_simple_conversion():
    """Convert a single PDF file to Markdown"""
    from simple_pdf2md import convert_pdf_to_markdown

    print("=" * 60)
    print("Example 1: Simple Single File Conversion")
    print("=" * 60)

    # Convert PDF (output will be in same directory with .md extension)
    output_path = convert_pdf_to_markdown('sample.pdf')
    print(f"✓ Converted to: {output_path}\n")


# ==============================================================================
# Example 2: Batch Conversion with Custom Output Directory
# ==============================================================================

def example_2_batch_conversion():
    """Convert all PDFs in a folder"""
    from simple_pdf2md import convert_folder

    print("=" * 60)
    print("Example 2: Batch Conversion")
    print("=" * 60)

    # Convert all PDFs in 'pdfs' folder to 'markdown' folder
    output_files = convert_folder('pdfs/', 'markdown/')

    print(f"\n✓ Successfully converted {len(output_files)} files")
    for file in output_files:
        print(f"  - {file}")
    print()


# ==============================================================================
# Example 3: Advanced Conversion with Specific Method
# ==============================================================================

def example_3_advanced_conversion():
    """Use advanced converter with specific method"""
    from pdf_to_markdown import PDFToMarkdownConverter

    print("=" * 60)
    print("Example 3: Advanced Conversion with Method Selection")
    print("=" * 60)

    # Initialize converter with pymupdf method
    converter = PDFToMarkdownConverter(method='pymupdf')

    # Convert single file
    markdown_content = converter.convert('document.pdf')
    print(f"Extracted {len(markdown_content)} characters of content")

    # Save to custom location
    converter.convert_file('document.pdf', 'output/custom_name.md')
    print("✓ Saved to custom location\n")


# ==============================================================================
# Example 4: Recursive Directory Processing
# ==============================================================================

def example_4_recursive_processing():
    """Process PDFs in nested directories"""
    from pdf_to_markdown import PDFToMarkdownConverter

    print("=" * 60)
    print("Example 4: Recursive Directory Processing")
    print("=" * 60)

    converter = PDFToMarkdownConverter(method='auto')

    # Convert all PDFs including subdirectories
    output_files = converter.convert_batch(
        'documents/',
        'markdown_output/',
        recursive=True
    )

    print(f"\n✓ Processed {len(output_files)} files recursively\n")


# ==============================================================================
# Example 5: Custom Post-Processing
# ==============================================================================

def example_5_custom_processing():
    """Convert and apply custom post-processing"""
    from pdf_to_markdown import PDFToMarkdownConverter
    import re

    print("=" * 60)
    print("Example 5: Custom Post-Processing")
    print("=" * 60)

    converter = PDFToMarkdownConverter()

    # Get markdown content
    markdown = converter.convert('document.pdf')

    # Custom post-processing
    # 1. Remove excessive blank lines
    markdown = re.sub(r'\n{3,}', '\n\n', markdown)

    # 2. Add custom header
    custom_header = """
# Document Title

**Author:** Custom Author
**Date:** 2025-01-01

---

"""
    markdown = custom_header + markdown

    # 3. Replace specific terms
    markdown = markdown.replace('old term', 'new term')

    # Save processed content
    with open('processed_output.md', 'w', encoding='utf-8') as f:
        f.write(markdown)

    print("✓ Applied custom post-processing")
    print("✓ Saved to processed_output.md\n")


# ==============================================================================
# Example 6: Error Handling and Retry Logic
# ==============================================================================

def example_6_error_handling():
    """Robust conversion with error handling"""
    from pdf_to_markdown import PDFToMarkdownConverter
    from pathlib import Path

    print("=" * 60)
    print("Example 6: Error Handling and Retry")
    print("=" * 60)

    converter = PDFToMarkdownConverter(method='auto')

    pdf_files = Path('pdfs/').glob('*.pdf')
    successful = []
    failed = []

    for pdf_file in pdf_files:
        try:
            # Try to convert
            output_path = converter.convert_file(str(pdf_file))
            successful.append(str(pdf_file))
            print(f"✓ {pdf_file.name}")

        except Exception as e:
            # Log failure
            failed.append((str(pdf_file), str(e)))
            print(f"✗ {pdf_file.name}: {e}")

    # Print summary
    print(f"\n✓ Successful: {len(successful)}")
    print(f"✗ Failed: {len(failed)}")

    if failed:
        print("\nFailed files:")
        for file, error in failed:
            print(f"  - {file}: {error}")
    print()


# ==============================================================================
# Example 7: Compare Different Methods
# ==============================================================================

def example_7_compare_methods():
    """Compare output quality of different methods"""
    from pdf_to_markdown import PDFToMarkdownConverter
    import time

    print("=" * 60)
    print("Example 7: Compare Conversion Methods")
    print("=" * 60)

    pdf_file = 'sample.pdf'
    methods = ['pymupdf', 'pdfplumber', 'pypdf2']

    results = {}

    for method in methods:
        try:
            print(f"\nTesting {method}...")
            converter = PDFToMarkdownConverter(method=method)

            # Measure time
            start_time = time.time()
            markdown = converter.convert(pdf_file)
            duration = time.time() - start_time

            results[method] = {
                'success': True,
                'length': len(markdown),
                'duration': duration,
                'lines': markdown.count('\n')
            }

            print(f"  ✓ Success")
            print(f"  - Duration: {duration:.2f}s")
            print(f"  - Content length: {len(markdown)} chars")
            print(f"  - Lines: {markdown.count('\n')}")

        except Exception as e:
            results[method] = {
                'success': False,
                'error': str(e)
            }
            print(f"  ✗ Failed: {e}")

    # Print comparison summary
    print("\n" + "=" * 60)
    print("Comparison Summary:")
    print("=" * 60)

    successful_methods = [m for m, r in results.items() if r['success']]

    if successful_methods:
        # Find fastest method
        fastest = min(successful_methods, key=lambda m: results[m]['duration'])
        print(f"Fastest: {fastest} ({results[fastest]['duration']:.2f}s)")

        # Find most content
        most_content = max(successful_methods, key=lambda m: results[m]['length'])
        print(f"Most content: {most_content} ({results[most_content]['length']} chars)")

    print()


# ==============================================================================
# Example 8: Integration with RAG System
# ==============================================================================

def example_8_rag_integration():
    """Convert PDFs for RAG system ingestion"""
    from pdf_to_markdown import PDFToMarkdownConverter
    from pathlib import Path

    print("=" * 60)
    print("Example 8: RAG System Integration")
    print("=" * 60)

    converter = PDFToMarkdownConverter(method='pymupdf')

    # Convert PDFs to markdown
    print("Step 1: Converting PDFs to Markdown...")
    output_files = converter.convert_batch('pdfs/', 'markdown/')

    print(f"✓ Converted {len(output_files)} files\n")

    # Now these markdown files can be ingested into RAG system
    print("Step 2: Ready for RAG ingestion")
    print("Example ingestion code:")
    print("""
    from knowledge_ingestor import KnowledgeIngestor

    ingestor = KnowledgeIngestor()
    for md_file in Path('markdown/').glob('*.md'):
        ingestor.ingest_file(str(md_file))
    """)
    print()


# ==============================================================================
# Example 9: Automated Pipeline
# ==============================================================================

def example_9_automated_pipeline():
    """Complete automated conversion pipeline"""
    from pdf_to_markdown import PDFToMarkdownConverter
    from pathlib import Path
    import shutil
    import json

    print("=" * 60)
    print("Example 9: Automated Conversion Pipeline")
    print("=" * 60)

    # Setup
    converter = PDFToMarkdownConverter(method='auto')
    input_dir = Path('incoming_pdfs')
    output_dir = Path('processed_markdown')
    archive_dir = Path('archive_pdfs')
    log_file = Path('conversion_log.json')

    # Ensure directories exist
    for directory in [input_dir, output_dir, archive_dir]:
        directory.mkdir(exist_ok=True)

    # Find PDFs
    pdf_files = list(input_dir.glob('*.pdf'))
    print(f"Found {len(pdf_files)} PDF(s) to process\n")

    # Process each file
    log_entries = []

    for pdf_file in pdf_files:
        entry = {
            'input': str(pdf_file),
            'timestamp': Path(pdf_file).stat().st_mtime
        }

        try:
            # Convert
            output_path = output_dir / pdf_file.with_suffix('.md').name
            converter.convert_file(str(pdf_file), str(output_path))

            # Archive original PDF
            archive_path = archive_dir / pdf_file.name
            shutil.move(str(pdf_file), str(archive_path))

            entry['status'] = 'success'
            entry['output'] = str(output_path)
            entry['archived'] = str(archive_path)

            print(f"✓ {pdf_file.name}")

        except Exception as e:
            entry['status'] = 'failed'
            entry['error'] = str(e)
            print(f"✗ {pdf_file.name}: {e}")

        log_entries.append(entry)

    # Save log
    with open(log_file, 'w') as f:
        json.dump(log_entries, f, indent=2)

    print(f"\n✓ Pipeline complete. Log saved to {log_file}\n")


# ==============================================================================
# Example 10: Extract Specific Content
# ==============================================================================

def example_10_extract_specific_content():
    """Extract specific sections from PDF"""
    from pdf_to_markdown import PDFToMarkdownConverter
    import re

    print("=" * 60)
    print("Example 10: Extract Specific Content")
    print("=" * 60)

    converter = PDFToMarkdownConverter()
    markdown = converter.convert('document.pdf')

    # Extract sections
    sections = {}

    # Find all headings and their content
    heading_pattern = r'^(#{1,6})\s+(.+)$'
    lines = markdown.split('\n')

    current_heading = 'Introduction'
    current_content = []

    for line in lines:
        heading_match = re.match(heading_pattern, line)
        if heading_match:
            # Save previous section
            if current_content:
                sections[current_heading] = '\n'.join(current_content)

            # Start new section
            current_heading = heading_match.group(2)
            current_content = []
        else:
            current_content.append(line)

    # Save last section
    if current_content:
        sections[current_heading] = '\n'.join(current_content)

    # Print section summary
    print(f"\nExtracted {len(sections)} sections:\n")
    for heading, content in sections.items():
        print(f"  - {heading}: {len(content)} characters")

    # Save specific section
    if 'Abstract' in sections:
        with open('abstract.md', 'w') as f:
            f.write(f"# Abstract\n\n{sections['Abstract']}")
        print("\n✓ Saved 'Abstract' section to abstract.md")

    print()


# ==============================================================================
# Main Menu
# ==============================================================================

def main():
    """Run example demonstrations"""
    print("\n" + "=" * 60)
    print("PDF to Markdown Converter - Example Usage")
    print("=" * 60)

    examples = {
        '1': ('Simple Single File Conversion', example_1_simple_conversion),
        '2': ('Batch Conversion', example_2_batch_conversion),
        '3': ('Advanced with Method Selection', example_3_advanced_conversion),
        '4': ('Recursive Directory Processing', example_4_recursive_processing),
        '5': ('Custom Post-Processing', example_5_custom_processing),
        '6': ('Error Handling', example_6_error_handling),
        '7': ('Compare Methods', example_7_compare_methods),
        '8': ('RAG System Integration', example_8_rag_integration),
        '9': ('Automated Pipeline', example_9_automated_pipeline),
        '10': ('Extract Specific Content', example_10_extract_specific_content),
    }

    print("\nAvailable Examples:")
    for key, (name, _) in examples.items():
        print(f"  {key}. {name}")
    print("  0. Run All Examples")
    print("  q. Quit")

    choice = input("\nSelect example (1-10, 0, or q): ").strip()

    if choice == 'q':
        print("\nGoodbye!")
        return

    if choice == '0':
        print("\nRunning all examples...\n")
        for name, func in examples.values():
            try:
                func()
            except Exception as e:
                print(f"✗ Example failed: {e}\n")
    elif choice in examples:
        name, func = examples[choice]
        print(f"\nRunning: {name}\n")
        try:
            func()
        except Exception as e:
            print(f"✗ Example failed: {e}\n")
    else:
        print("Invalid choice!")


if __name__ == '__main__':
    main()
