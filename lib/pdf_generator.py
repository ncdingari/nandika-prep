"""
PDF worksheet generator using ReportLab.
Produces letter-size worksheets for daily sessions and printable drills.
"""
import io
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.platypus import HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER


def _base_doc(buf: io.BytesIO) -> SimpleDocTemplate:
    return SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )


def _styles():
    ss = getSampleStyleSheet()
    body = ParagraphStyle("body", parent=ss["Normal"], fontSize=11, leading=14)
    heading = ParagraphStyle("heading", parent=ss["Heading1"], fontSize=13, leading=16)
    prompt = ParagraphStyle("prompt", parent=ss["Normal"], fontSize=12, leading=15, spaceAfter=4)
    choice = ParagraphStyle("choice", parent=ss["Normal"], fontSize=11, leading=14, leftIndent=20)
    small = ParagraphStyle("small", parent=ss["Normal"], fontSize=9, leading=11, textColor=colors.grey)
    return {"body": body, "heading": heading, "prompt": prompt, "choice": choice, "small": small}


def generate_daily_pdf(
    worksheet: dict,
    student_name: str = "Nandika",
    date_str: str = "",
) -> bytes:
    buf = io.BytesIO()
    doc = _base_doc(buf)
    st = _styles()
    story = []

    title = f"{student_name}'s Daily Worksheet"
    story.append(Paragraph(f"<b>{title}</b>", st["heading"]))
    if date_str:
        story.append(Paragraph(f"Date: {date_str}", st["small"]))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 0.15 * inch))

    questions = worksheet.get("questions", [])
    for i, q in enumerate(questions, 1):
        prompt_text = q.get("prompt", "")
        story.append(Paragraph(f"<b>{i}.</b> {prompt_text}", st["prompt"]))
        choices = q.get("choices") or []
        if choices:
            for ch in choices:
                cid = ch.get("id", "?")
                label = ch.get("label", "")
                story.append(Paragraph(f"( {cid} )  {label}", st["choice"]))
        else:
            story.append(Paragraph("Answer: _______________________", st["choice"]))
        story.append(Spacer(1, 0.08 * inch))

    story.append(Spacer(1, 0.2 * inch))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
    story.append(Paragraph("Well done today.", st["small"]))

    doc.build(story)
    return buf.getvalue()


def generate_cogat_pdf(
    questions: list[dict],
    student_name: str = "Nandika",
    day_number: int = 1,
    date_str: str = "",
) -> bytes:
    """Generate a printable CogAT worksheet PDF."""
    buf = io.BytesIO()
    doc = _base_doc(buf)
    st = _styles()
    story = []

    # Header
    story.append(Paragraph(
        f"<b>{student_name}'s Worksheet</b> - Day {day_number}",
        st["heading"]
    ))
    if date_str:
        story.append(Paragraph(f"Date: {date_str}", st["small"]))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 0.15 * inch))

    for i, q in enumerate(questions, 1):
        # Question prompt
        prompt_text = q.get("prompt", "")
        story.append(Paragraph(f"<b>{i}.</b> {prompt_text}", st["prompt"]))

        # Four choices as bubbles A B C D
        choices = q.get("choices", [])
        for ch in choices:
            cid = ch.get("id", "?")
            label = ch.get("label", "")
            story.append(Paragraph(f"( {cid} )  {label}", st["choice"]))
        story.append(Spacer(1, 0.1 * inch))

    # Footer
    story.append(Spacer(1, 0.2 * inch))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
    story.append(Paragraph(
        "Keep going, your brain is building muscles. NandikaPrep",
        st["small"]
    ))

    doc.build(story)
    return buf.getvalue()


def generate_kumon_math_pdf(
    questions: list[dict],
    level: int,
    skill_name: str = "",
    student_name: str = "Nandika",
    date_str: str = "",
) -> bytes:
    """Generate a printable Kumon math worksheet PDF."""
    buf = io.BytesIO()
    doc = _base_doc(buf)
    st = _styles()
    story = []

    # Header table (name, date, start time, finish time)
    header_data = [
        ["Name:", student_name, "Date:", date_str, "Level:", str(level)],
        ["Start Time:", "________", "Finish Time:", "________", "Score:", "___/___"],
    ]
    header_table = Table(header_data, colWidths=[
        0.8 * inch, 1.5 * inch, 0.7 * inch, 1.5 * inch, 0.6 * inch, 0.8 * inch
    ])
    header_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.05 * inch))

    title = f"Kumon Math Level {level}"
    if skill_name:
        title += f": {skill_name}"
    story.append(Paragraph(f"<b>{title}</b>", st["heading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 0.1 * inch))

    # Two-column layout: problem on left, work area on right
    for i, q in enumerate(questions, 1):
        prompt = q.get("prompt", "")
        kind = q.get("kind", "")
        row_data = [[f"{i}.   {prompt}", "_" * 30]]
        t = Table(row_data, colWidths=[3 * inch, 3.5 * inch])
        t.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (0, 0), "Courier"),
            ("FONTSIZE", (0, 0), (-1, -1), 13),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(t)

    story.append(Spacer(1, 0.2 * inch))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
    story.append(Paragraph("Shabaash Nandika! Every problem counts.", st["small"]))

    doc.build(story)
    return buf.getvalue()


def generate_kumon_reading_pdf(
    items: list[dict],
    writing_prompt: dict,
    level: int,
    skill_name: str = "",
    student_name: str = "Nandika",
    date_str: str = "",
) -> bytes:
    """Generate a printable Kumon reading/writing worksheet PDF."""
    buf = io.BytesIO()
    doc = _base_doc(buf)
    st = _styles()
    story = []

    # Header
    story.append(Paragraph(
        f"<b>Kumon Reading Level {level}</b>{': ' + skill_name if skill_name else ''}",
        st["heading"]
    ))
    story.append(Paragraph(
        f"{student_name} | {date_str}",
        st["small"]
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 0.1 * inch))

    # Passages (group by passage)
    seen_passages = set()
    for item in items:
        passage = item.get("passage", "")
        if passage and passage not in seen_passages:
            seen_passages.add(passage)
            story.append(Paragraph(f"<i>{passage}</i>", st["body"]))
            story.append(Spacer(1, 0.08 * inch))

    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Spacer(1, 0.08 * inch))

    # Questions
    for i, item in enumerate(items, 1):
        prompt = item.get("prompt", "")
        story.append(Paragraph(f"<b>{i}.</b> {prompt}", st["prompt"]))
        choices = item.get("choices", [])
        if choices:
            for ch in choices:
                story.append(Paragraph(f"( {ch} )", st["choice"]))
        else:
            story.append(Paragraph("Answer: _______________________", st["choice"]))
        story.append(Spacer(1, 0.05 * inch))

    # Writing prompt with lined space
    if writing_prompt:
        story.append(Spacer(1, 0.15 * inch))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
        story.append(Paragraph("<b>Writing Prompt</b>", st["heading"]))
        story.append(Paragraph(writing_prompt.get("text", ""), st["prompt"]))
        # Lined space: draw blank lines
        lines = 6
        for _ in range(lines):
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey,
                                    spaceAfter=16))

    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph("Beautiful work today. NandikaPrep", st["small"]))

    doc.build(story)
    return buf.getvalue()
