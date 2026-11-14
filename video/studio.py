"""GTA 6 HQ video studio: command line entry point.

    python video/studio.py doctor
    python video/studio.py new <slug> --kind game-trailer --format 16x9
    python video/studio.py audio <slug>
    python video/studio.py captions <slug>
    python video/studio.py render <slug> --preview | --final [--format 16x9|9x16|1x1]
    python video/studio.py audit <slug> [--only technical,visual,...]
    python video/studio.py deliver <slug>
    python video/studio.py export <slug> --platform youtube

See video/docs/VIDEO-STUDIO-PRODUCTION-GUIDE.md.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine.cli import main  # noqa: E402

if __name__ == '__main__':
    sys.exit(main())
