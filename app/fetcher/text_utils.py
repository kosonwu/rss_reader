"""
Shared text-cleaning utilities for tag extraction and NER services.
"""

import re

# Strip leading/trailing non-word, non-CJK characters (e.g. !@#$%^:… punctuation).
_EDGE_RE = re.compile(
    r'^[^\w\u4e00-\u9fff\u3400-\u4dbf]+'
    r'|[^\w\u4e00-\u9fff\u3400-\u4dbf]+$'
)

# ══════════════════════════════════════════════════════════════
# 第一層：Regex 前處理（輕量，優先執行）
# ══════════════════════════════════════════════════════════════
_POSSESSIVE_RE = re.compile(r"'s\b")
_LEADING_THE_RE = re.compile(r"(?i)^the\s+")
_CJK_DUP_RE = re.compile(r'([\u4e00-\u9fff])\1+')
_MULTI_WORD_DUP_RE = re.compile(r'([^\s]{2,})\1+')
_WHITESPACE_RE = re.compile(r'\s+')


def preprocess(text: str) -> str:
    """Lightweight regex pre-processing applied before model inference.

    - Strip surrounding quotes
    - Remove English possessives ('s)
    - Remove leading article 'the'
    - Collapse repeated CJK characters (系系→系)
    - Collapse repeated multi-char tokens (醫學系醫學系→醫學系)
    - Normalise whitespace
    """
    text = text.strip().strip('"').strip("'")
    text = _POSSESSIVE_RE.sub("", text)
    text = _LEADING_THE_RE.sub("", text)
    text = _CJK_DUP_RE.sub(r'\1', text)
    text = _MULTI_WORD_DUP_RE.sub(r'\1', text)
    text = _WHITESPACE_RE.sub(' ', text).strip()
    return text


def clean_token(text: str) -> str:
    """Strip edge punctuation/symbols from a keyword or entity text.

    Returns an empty string if the cleaned result is a single character,
    since lone characters (e.g. 'Z', '美') are rarely meaningful as tags or entities.
    """
    text = _EDGE_RE.sub('', text).strip()
    return text if len(text) > 1 else ''
