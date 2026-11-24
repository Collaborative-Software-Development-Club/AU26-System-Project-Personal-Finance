import logging
import sys

from finance.core.config import settings

LOG_FORMAT = "%(asctime)s %(levelname)s [%(name)s] %(message)s"
APP_LOGGER_NAME = "finance"


def setup_logging() -> None:
    """Configure app loggers from LOG_LEVEL.

    Uvicorn --log-level only controls uvicorn's own output. Application
    debug logs, including session fingerprints, follow LOG_LEVEL so they
    stay off when the value is INFO or higher.
    """
    level = getattr(logging, settings.log_level, logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(LOG_FORMAT))
    handler.setLevel(level)

    logger = logging.getLogger(APP_LOGGER_NAME)
    logger.setLevel(level)
    logger.handlers.clear()
    logger.addHandler(handler)
    logger.propagate = False

    logger.debug("application logging configured at %s", settings.log_level)
