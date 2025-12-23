#!/usr/bin/env python3
"""
Simple PDF to Markdown Converter

A minimal, easy-to-use script for converting PDFs to Markdown.
Only requires pymupdf4llm (the best quality converter).

Usage:
    python simple_pdf2md.py input.pdf
    python simple_pdf2md.py input_folder/
    python simple_pdf2md.py input_folder/ -o output_folder/
"""

import sys
import os
from pathlib import Path
from typing import List
import argparse


def convert_pdf_to_markdown(pdf_path: str, output_path: str = None) -> str:
    """
    Convert a single PDF file to Markdown

    Args:
        pdf_path: Path to the PDF file
        output_path: Path to save the Markdown file (optional)

    Returns:
        Path to the output Markdown file
    """
    try:
        import pymupdf4llm
    except ImportError:
        print("Error: pymupdf4llm not installed")
        print("Install it with: pip install pymupdf4llm")
        sys.exit(1)

    # Convert PDF to Markdown
    print(f"Converting: {pdf_path}")
    markdown_text = pymupdf4llm.to_markdown(pdf_path)

    # Determine output path
    if output_path is None:
        output_path = Path(pdf_path).with_suffix('.md')
    else:
        output_path = Path(output_path)

    # Create output directory if needed
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write Markdown file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(markdown_text)

    print(f"✓ Saved: {output_path}")
    return str(output_path)


def convert_folder(input_dir: str, output_dir: str = None) -> List[str]:
    """
    Convert all PDF files in a folder to Markdown

    Args:
        input_dir: Directory containing PDF files
        output_dir: Directory to save Markdown files (optional)

    Returns:
        List of output file paths
    """
    input_path = Path(input_dir)

    if not input_path.exists():
        print(f"Error: Directory not found: {input_dir}")
        sys.exit(1)

    # Find all PDF files
    pdf_files = list(input_path.glob("*.pdf"))

    if not pdf_files:
        print(f"No PDF files found in {input_dir}")
        return []

    print(f"\nFound {len(pdf_files)} PDF file(s)\n")

    # Set output directory
    if output_dir is None:
        output_dir = input_path
    else:
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

    # Convert each file
    output_files = []
    success = 0
    failed = 0

    for pdf_file in pdf_files:
        try:
            output_file = output_dir / pdf_file.with_suffix('.md').name
            result = convert_pdf_to_markdown(str(pdf_file), str(output_file))
            output_files.append(result)
            success += 1
        except Exception as e:
            print(f"✗ Failed: {pdf_file.name} - {e}")
            failed += 1

    # Print summary
    print("\n" + "=" * 50)
    print(f"Conversion Complete!")
    print(f"  Success: {success}/{len(pdf_files)}")
    print(f"  Failed:  {failed}/{len(pdf_files)}")
    print("=" * 50)

    return output_files


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Simple PDF to Markdown converter',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Convert single file
  python simple_pdf2md.py document.pdf

  # Convert all PDFs in folder
  python simple_pdf2md.py pdf_folder/

  # Specify output location
  python simple_pdf2md.py pdf_folder/ -o markdown_folder/

Requirements:
  pip install pymupdf4llm
        """
    )

    parser.add_argument(
        'input',
        help='PDF file or directory to convert'
    )
    parser.add_argument(
        '-o', '--output',
        default=None,
        help='Output directory (default: same as input)'
    )

    args = parser.parse_args()

    # Check if input exists
    input_path = Path(args.input)

    if not input_path.exists():
        print(f"Error: Path not found: {args.input}")
        sys.exit(1)

    # Convert
    try:
        if input_path.is_file():
            convert_pdf_to_markdown(args.input, args.output)
        elif input_path.is_dir():
            convert_folder(args.input, args.output)
        else:
            print(f"Error: Invalid path: {args.input}")
            sys.exit(1)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
