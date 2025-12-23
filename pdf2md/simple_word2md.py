#!/usr/bin/env python3
"""
Simple Word to Markdown Converter

A minimal, easy-to-use script for converting DOCX files to Markdown.
Uses mammoth (pure Python, no system dependencies).

Usage:
    python simple_word2md.py input.docx
    python simple_word2md.py input_folder/
    python simple_word2md.py input_folder/ -o output_folder/
"""

import sys
import os
from pathlib import Path
from typing import List
import argparse


def convert_docx_to_markdown(docx_path: str, output_path: str = None) -> str:
    """
    Convert a single DOCX file to Markdown

    Args:
        docx_path: Path to the DOCX file
        output_path: Path to save the Markdown file (optional)

    Returns:
        Path to the output Markdown file
    """
    try:
        import mammoth
    except ImportError:
        print("Error: mammoth not installed")
        print("Install it with: pip install mammoth")
        sys.exit(1)

    # Convert DOCX to Markdown
    print(f"Converting: {docx_path}")

    with open(docx_path, 'rb') as docx_file:
        result = mammoth.convert_to_markdown(docx_file)
        markdown_text = result.value

        # Log any warnings
        if result.messages:
            for message in result.messages:
                print(f"  Warning: {message}")

    # Determine output path
    if output_path is None:
        output_path = Path(docx_path).with_suffix('.md')
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
    Convert all DOCX files in a folder to Markdown

    Args:
        input_dir: Directory containing DOCX files
        output_dir: Directory to save Markdown files (optional)

    Returns:
        List of output file paths
    """
    input_path = Path(input_dir)

    if not input_path.exists():
        print(f"Error: Directory not found: {input_dir}")
        sys.exit(1)

    # Find all DOCX files (exclude temporary files ~$*)
    docx_files = [f for f in input_path.glob("*.docx") if not f.name.startswith('~$')]
    doc_files = [f for f in input_path.glob("*.doc") if not f.name.startswith('~$')]
    all_files = docx_files + doc_files

    if not all_files:
        print(f"No Word files found in {input_dir}")
        return []

    print(f"\nFound {len(all_files)} Word file(s)\n")

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

    for word_file in all_files:
        try:
            output_file = output_dir / word_file.with_suffix('.md').name
            result = convert_docx_to_markdown(str(word_file), str(output_file))
            output_files.append(result)
            success += 1
        except Exception as e:
            print(f"✗ Failed: {word_file.name} - {e}")
            failed += 1

    # Print summary
    print("\n" + "=" * 50)
    print(f"Conversion Complete!")
    print(f"  Success: {success}/{len(all_files)}")
    print(f"  Failed:  {failed}/{len(all_files)}")
    print("=" * 50)

    return output_files


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Simple Word (DOCX) to Markdown converter',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Convert single file
  python simple_word2md.py document.docx

  # Convert all Word files in folder
  python simple_word2md.py word_folder/

  # Specify output location
  python simple_word2md.py word_folder/ -o markdown_folder/

Requirements:
  pip install mammoth
        """
    )

    parser.add_argument(
        'input',
        help='Word file or directory to convert'
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
            convert_docx_to_markdown(args.input, args.output)
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
