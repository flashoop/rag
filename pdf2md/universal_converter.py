#!/usr/bin/env python3
"""
Universal Document to Markdown Converter

Converts PDF, DOCX, DOC, HTML, and other formats to Markdown.
Automatically detects file type and uses appropriate converter.

Usage:
    python universal_converter.py input_folder/ output_folder/
    python universal_converter.py document.pdf output.md
    python universal_converter.py --help
"""

import sys
import os
import argparse
from pathlib import Path
from typing import List, Optional
import logging

# Import specific converters
try:
    from pdf_to_markdown import PDFToMarkdownConverter
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    from word_to_markdown import WordToMarkdownConverter
    WORD_AVAILABLE = True
except ImportError:
    WORD_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class UniversalConverter:
    """Universal document to Markdown converter"""

    # Supported file extensions
    PDF_EXTENSIONS = ['.pdf']
    WORD_EXTENSIONS = ['.docx', '.doc']
    HTML_EXTENSIONS = ['.html', '.htm']

    def __init__(self):
        """Initialize converter"""
        self.pdf_converter = None
        self.word_converter = None

        # Initialize available converters
        if PDF_AVAILABLE:
            try:
                self.pdf_converter = PDFToMarkdownConverter(method='auto')
                logger.info("✓ PDF converter available")
            except Exception as e:
                logger.warning(f"PDF converter initialization failed: {e}")

        if WORD_AVAILABLE:
            try:
                self.word_converter = WordToMarkdownConverter(method='auto')
                logger.info("✓ Word converter available")
            except Exception as e:
                logger.warning(f"Word converter initialization failed: {e}")

        # Check if at least one converter is available
        if not self.pdf_converter and not self.word_converter:
            raise ImportError(
                "No converters available. Install dependencies:\n"
                "  PDF:  pip install pymupdf4llm\n"
                "  Word: pip install mammoth\n"
                "  Or:   pip install -r requirements.txt && pip install -r requirements_word.txt"
            )

    def get_file_type(self, file_path: str) -> Optional[str]:
        """
        Detect file type from extension

        Args:
            file_path: Path to file

        Returns:
            'pdf', 'word', 'html', or None
        """
        ext = Path(file_path).suffix.lower()

        if ext in self.PDF_EXTENSIONS:
            return 'pdf'
        elif ext in self.WORD_EXTENSIONS:
            return 'word'
        elif ext in self.HTML_EXTENSIONS:
            return 'html'
        else:
            return None

    def convert_file(self, input_path: str, output_path: Optional[str] = None) -> str:
        """
        Convert single file to Markdown

        Args:
            input_path: Path to input file
            output_path: Path to output Markdown file (optional)

        Returns:
            Path to output file
        """
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"File not found: {input_path}")

        # Detect file type
        file_type = self.get_file_type(input_path)

        if file_type is None:
            raise ValueError(
                f"Unsupported file type: {Path(input_path).suffix}\n"
                f"Supported: {', '.join(self.PDF_EXTENSIONS + self.WORD_EXTENSIONS + self.HTML_EXTENSIONS)}"
            )

        logger.info(f"Detected file type: {file_type}")
        logger.info(f"Converting: {input_path}")

        # Convert based on type
        if file_type == 'pdf':
            if not self.pdf_converter:
                raise RuntimeError(
                    "PDF converter not available. Install: pip install pymupdf4llm"
                )
            return self.pdf_converter.convert_file(input_path, output_path)

        elif file_type == 'word':
            if not self.word_converter:
                raise RuntimeError(
                    "Word converter not available. Install: pip install mammoth"
                )
            return self.word_converter.convert_file(input_path, output_path)

        elif file_type == 'html':
            return self.convert_html_file(input_path, output_path)

        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    def convert_html_file(self, html_path: str, output_path: Optional[str] = None) -> str:
        """
        Convert HTML file to Markdown

        Args:
            html_path: Path to HTML file
            output_path: Path to output Markdown file

        Returns:
            Path to output file
        """
        try:
            from markdownify import markdownify as md
        except ImportError:
            raise ImportError("HTML conversion requires: pip install markdownify")

        # Read HTML
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()

        # Convert to Markdown
        markdown_content = md(html_content)

        # Determine output path
        if output_path is None:
            output_path = Path(html_path).with_suffix('.md')
        else:
            output_path = Path(output_path)

        # Write to file
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
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
        Batch convert files in directory

        Args:
            input_dir: Directory containing files
            output_dir: Directory for output Markdown files
            recursive: Whether to process subdirectories

        Returns:
            List of output file paths
        """
        input_path = Path(input_dir)

        if not input_path.exists():
            raise FileNotFoundError(f"Directory not found: {input_dir}")

        # Find all supported files
        all_files = []

        extensions = self.PDF_EXTENSIONS + self.WORD_EXTENSIONS + self.HTML_EXTENSIONS

        if recursive:
            for ext in extensions:
                all_files.extend(input_path.rglob(f"*{ext}"))
        else:
            for ext in extensions:
                all_files.extend(input_path.glob(f"*{ext}"))

        # Filter out temporary files
        all_files = [f for f in all_files if not f.name.startswith('~$')]

        if not all_files:
            logger.warning(f"No supported files found in {input_dir}")
            logger.info(f"Supported formats: {', '.join(extensions)}")
            return []

        logger.info(f"Found {len(all_files)} file(s) to convert")

        # Count by type
        type_counts = {}
        for file in all_files:
            file_type = self.get_file_type(str(file))
            type_counts[file_type] = type_counts.get(file_type, 0) + 1

        for file_type, count in type_counts.items():
            logger.info(f"  - {file_type}: {count} files")

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

        for input_file in all_files:
            try:
                # Preserve directory structure if recursive
                if recursive:
                    relative_path = input_file.relative_to(input_path)
                    output_path = output_dir / relative_path.with_suffix('.md')
                else:
                    output_path = output_dir / input_file.with_suffix('.md').name

                # Convert file
                result = self.convert_file(str(input_file), str(output_path))
                output_files.append(result)
                success_count += 1

            except Exception as e:
                logger.error(f"✗ Failed to convert {input_file.name}: {e}")
                fail_count += 1

        # Print summary
        logger.info("\n" + "=" * 60)
        logger.info(f"Conversion Complete!")
        logger.info(f"  Success: {success_count}/{len(all_files)}")
        logger.info(f"  Failed:  {fail_count}/{len(all_files)}")
        logger.info("=" * 60)

        return output_files


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description='Universal Document to Markdown Converter',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Convert single file (auto-detects type)
  python universal_converter.py document.pdf output.md
  python universal_converter.py document.docx output.md
  python universal_converter.py page.html output.md

  # Convert all supported files in folder
  python universal_converter.py documents/ markdown/

  # Convert recursively
  python universal_converter.py documents/ markdown/ --recursive

Supported Formats:
  - PDF (.pdf)
  - Word (.docx, .doc)
  - HTML (.html, .htm)

Installation:
  # Install all converters
  pip install -r requirements.txt
  pip install -r requirements_word.txt

  # Or install specific converters
  pip install pymupdf4llm  # For PDF
  pip install mammoth      # For Word
  pip install markdownify  # For HTML
        """
    )

    parser.add_argument(
        'input',
        help='Input file or directory'
    )
    parser.add_argument(
        'output',
        nargs='?',
        default=None,
        help='Output Markdown file or directory (default: same as input)'
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

    # Print available converters
    logger.info("Universal Document to Markdown Converter\n")
    logger.info("Checking available converters...")

    # Initialize converter
    try:
        converter = UniversalConverter()
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
