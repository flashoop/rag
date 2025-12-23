#!/usr/bin/env python3
"""
PDF to Markdown Batch Converter

Converts PDF files to Markdown format using multiple methods:
1. pymupdf4llm - Best for preserving structure
2. pdfplumber - Good for tables and layout
3. PyPDF2 - Fallback for simple extraction

Usage:
    python pdf_to_markdown.py input_folder output_folder
    python pdf_to_markdown.py input_folder output_folder --method pymupdf
    python pdf_to_markdown.py single_file.pdf output.md
"""

import os
import sys
import argparse
from pathlib import Path
from typing import Optional, List
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PDFToMarkdownConverter:
    """Converts PDF files to Markdown using multiple methods"""

    def __init__(self, method: str = 'auto'):
        """
        Initialize converter with specified method

        Args:
            method: 'pymupdf', 'pdfplumber', 'pypdf2', or 'auto' (try all)
        """
        self.method = method
        self._check_dependencies()

    def _check_dependencies(self):
        """Check which PDF libraries are available"""
        self.available_methods = []

        try:
            import pymupdf4llm
            self.available_methods.append('pymupdf')
            logger.info("✓ pymupdf4llm available")
        except ImportError:
            logger.debug("✗ pymupdf4llm not available")

        try:
            import pdfplumber
            self.available_methods.append('pdfplumber')
            logger.info("✓ pdfplumber available")
        except ImportError:
            logger.debug("✗ pdfplumber not available")

        try:
            import PyPDF2
            self.available_methods.append('pypdf2')
            logger.info("✓ PyPDF2 available")
        except ImportError:
            logger.debug("✗ PyPDF2 not available")

        if not self.available_methods:
            raise ImportError(
                "No PDF libraries found. Install at least one:\n"
                "  pip install pymupdf4llm\n"
                "  pip install pdfplumber\n"
                "  pip install PyPDF2"
            )

    def convert_with_pymupdf(self, pdf_path: str) -> str:
        """
        Convert PDF to Markdown using pymupdf4llm (best quality)

        Args:
            pdf_path: Path to PDF file

        Returns:
            Markdown content as string
        """
        import pymupdf4llm

        try:
            # Convert PDF to markdown
            markdown_text = pymupdf4llm.to_markdown(
                pdf_path,
                page_chunks=False,  # Single output
                write_images=False  # Don't extract images (can enable if needed)
            )
            return markdown_text
        except Exception as e:
            logger.error(f"pymupdf4llm failed: {e}")
            raise

    def convert_with_pdfplumber(self, pdf_path: str) -> str:
        """
        Convert PDF to Markdown using pdfplumber (good for tables)

        Args:
            pdf_path: Path to PDF file

        Returns:
            Markdown content as string
        """
        import pdfplumber

        markdown_content = []

        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    # Add page header
                    markdown_content.append(f"\n## Page {page_num}\n")

                    # Extract text
                    text = page.extract_text()
                    if text:
                        markdown_content.append(text)

                    # Extract tables
                    tables = page.extract_tables()
                    if tables:
                        for table in tables:
                            markdown_table = self._format_table_as_markdown(table)
                            markdown_content.append(f"\n{markdown_table}\n")

            return "\n".join(markdown_content)

        except Exception as e:
            logger.error(f"pdfplumber failed: {e}")
            raise

    def convert_with_pypdf2(self, pdf_path: str) -> str:
        """
        Convert PDF to Markdown using PyPDF2 (basic extraction)

        Args:
            pdf_path: Path to PDF file

        Returns:
            Markdown content as string
        """
        from PyPDF2 import PdfReader

        markdown_content = []

        try:
            reader = PdfReader(pdf_path)

            for page_num, page in enumerate(reader.pages, 1):
                markdown_content.append(f"\n## Page {page_num}\n")

                text = page.extract_text()
                if text:
                    # Clean up text
                    text = text.replace('\x00', '')  # Remove null bytes
                    markdown_content.append(text)

            return "\n".join(markdown_content)

        except Exception as e:
            logger.error(f"PyPDF2 failed: {e}")
            raise

    def _format_table_as_markdown(self, table: List[List[str]]) -> str:
        """
        Format table data as Markdown table

        Args:
            table: 2D list of table cells

        Returns:
            Markdown table string
        """
        if not table or not table[0]:
            return ""

        # Get column count
        col_count = len(table[0])

        # Format header row
        header = "| " + " | ".join(str(cell or "") for cell in table[0]) + " |"

        # Format separator
        separator = "|" + "|".join([" --- " for _ in range(col_count)]) + "|"

        # Format data rows
        rows = []
        for row in table[1:]:
            row_str = "| " + " | ".join(str(cell or "") for cell in row) + " |"
            rows.append(row_str)

        return "\n".join([header, separator] + rows)

    def convert(self, pdf_path: str) -> str:
        """
        Convert PDF to Markdown using best available method

        Args:
            pdf_path: Path to PDF file

        Returns:
            Markdown content as string
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

        logger.info(f"Converting: {pdf_path}")

        # Determine method to use
        if self.method == 'auto':
            # Try methods in order of quality
            methods = ['pymupdf', 'pdfplumber', 'pypdf2']
            methods = [m for m in methods if m in self.available_methods]
        else:
            if self.method not in self.available_methods:
                raise ValueError(
                    f"Method '{self.method}' not available. "
                    f"Available: {self.available_methods}"
                )
            methods = [self.method]

        # Try each method until one succeeds
        last_error = None
        for method in methods:
            try:
                logger.info(f"Trying method: {method}")

                if method == 'pymupdf':
                    return self.convert_with_pymupdf(pdf_path)
                elif method == 'pdfplumber':
                    return self.convert_with_pdfplumber(pdf_path)
                elif method == 'pypdf2':
                    return self.convert_with_pypdf2(pdf_path)

            except Exception as e:
                last_error = e
                logger.warning(f"Method {method} failed: {e}")
                continue

        # All methods failed
        raise RuntimeError(
            f"All conversion methods failed. Last error: {last_error}"
        )

    def convert_file(
        self,
        pdf_path: str,
        output_path: Optional[str] = None
    ) -> str:
        """
        Convert single PDF file to Markdown

        Args:
            pdf_path: Path to PDF file
            output_path: Path to output Markdown file (optional)

        Returns:
            Path to output file
        """
        # Convert PDF to Markdown
        markdown_content = self.convert(pdf_path)

        # Determine output path
        if output_path is None:
            output_path = Path(pdf_path).with_suffix('.md')
        else:
            output_path = Path(output_path)

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Write to file
        with open(output_path, 'w', encoding='utf-8') as f:
            # Add metadata header
            f.write(f"# {Path(pdf_path).stem}\n\n")
            f.write(f"*Converted from: {Path(pdf_path).name}*\n\n")
            f.write("---\n\n")
            f.write(markdown_content)

        logger.info(f"✓ Saved: {output_path}")
        return str(output_path)

    def convert_batch(
        self,
        input_dir: str,
        output_dir: Optional[str] = None,
        recursive: bool = False
    ) -> List[str]:
        """
        Batch convert PDF files in directory

        Args:
            input_dir: Directory containing PDF files
            output_dir: Directory for output Markdown files (default: same as input)
            recursive: Whether to process subdirectories

        Returns:
            List of output file paths
        """
        input_path = Path(input_dir)

        if not input_path.exists():
            raise FileNotFoundError(f"Input directory not found: {input_dir}")

        # Find PDF files
        if recursive:
            pdf_files = list(input_path.rglob("*.pdf"))
        else:
            pdf_files = list(input_path.glob("*.pdf"))

        if not pdf_files:
            logger.warning(f"No PDF files found in {input_dir}")
            return []

        logger.info(f"Found {len(pdf_files)} PDF file(s)")

        # Determine output directory
        if output_dir is None:
            output_dir = input_path
        else:
            output_dir = Path(output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)

        # Convert each file
        output_files = []
        success_count = 0
        fail_count = 0

        for pdf_file in pdf_files:
            try:
                # Preserve directory structure if recursive
                if recursive:
                    relative_path = pdf_file.relative_to(input_path)
                    output_path = output_dir / relative_path.with_suffix('.md')
                else:
                    output_path = output_dir / pdf_file.with_suffix('.md').name

                # Convert file
                result = self.convert_file(str(pdf_file), str(output_path))
                output_files.append(result)
                success_count += 1

            except Exception as e:
                logger.error(f"✗ Failed to convert {pdf_file}: {e}")
                fail_count += 1

        # Print summary
        logger.info("\n" + "=" * 60)
        logger.info(f"Conversion Complete!")
        logger.info(f"  Success: {success_count}/{len(pdf_files)}")
        logger.info(f"  Failed:  {fail_count}/{len(pdf_files)}")
        logger.info("=" * 60)

        return output_files


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description='Batch convert PDF files to Markdown format',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Convert single file
  python pdf_to_markdown.py input.pdf output.md

  # Convert all PDFs in a folder
  python pdf_to_markdown.py input_folder/ output_folder/

  # Convert with specific method
  python pdf_to_markdown.py input_folder/ output_folder/ --method pymupdf

  # Convert recursively
  python pdf_to_markdown.py input_folder/ output_folder/ --recursive

Available methods:
  - pymupdf: Best quality, preserves structure (recommended)
  - pdfplumber: Good for tables and complex layouts
  - pypdf2: Basic text extraction (fallback)
  - auto: Try all methods (default)
        """
    )

    parser.add_argument(
        'input',
        help='Input PDF file or directory'
    )
    parser.add_argument(
        'output',
        nargs='?',
        default=None,
        help='Output Markdown file or directory (default: same as input)'
    )
    parser.add_argument(
        '--method',
        choices=['auto', 'pymupdf', 'pdfplumber', 'pypdf2'],
        default='auto',
        help='Conversion method to use (default: auto)'
    )
    parser.add_argument(
        '--recursive',
        '-r',
        action='store_true',
        help='Process subdirectories recursively'
    )
    parser.add_argument(
        '--verbose',
        '-v',
        action='store_true',
        help='Enable verbose logging'
    )

    args = parser.parse_args()

    # Set log level
    if args.verbose:
        logger.setLevel(logging.DEBUG)

    # Initialize converter
    try:
        converter = PDFToMarkdownConverter(method=args.method)
    except ImportError as e:
        logger.error(str(e))
        sys.exit(1)

    # Convert files
    try:
        input_path = Path(args.input)

        if input_path.is_file():
            # Single file conversion
            converter.convert_file(args.input, args.output)

        elif input_path.is_dir():
            # Batch conversion
            converter.convert_batch(
                args.input,
                args.output,
                recursive=args.recursive
            )

        else:
            logger.error(f"Invalid input path: {args.input}")
            sys.exit(1)

    except Exception as e:
        logger.error(f"Conversion failed: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
