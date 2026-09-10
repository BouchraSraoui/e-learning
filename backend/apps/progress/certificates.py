import io


def build_certificate_pdf(cert) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    width, height = landscape(A4)
    c = canvas.Canvas(buffer, pagesize=landscape(A4))

    primary = colors.HexColor('#2563EB')
    brand = colors.HexColor('#00AEEF')
    ink = colors.HexColor('#0f172a')
    muted = colors.HexColor('#64748b')

    c.setStrokeColor(primary)
    c.setLineWidth(3)
    c.rect(12 * mm, 12 * mm, width - 24 * mm, height - 24 * mm)
    c.setStrokeColor(brand)
    c.setLineWidth(1)
    c.rect(16 * mm, 16 * mm, width - 32 * mm, height - 32 * mm)

    center = width / 2
    c.setFillColor(brand)
    c.setFont('Helvetica-Bold', 26)
    c.drawCentredString(center, height - 42 * mm, 'ICOSNET')
    c.setFillColor(muted)
    c.setFont('Helvetica', 12)
    c.drawCentredString(center, height - 50 * mm, 'Bibliothèque de formation')

    c.setFillColor(ink)
    c.setFont('Helvetica-Bold', 30)
    c.drawCentredString(center, height - 78 * mm, 'Certificate of Completion')

    c.setFillColor(muted)
    c.setFont('Helvetica', 13)
    c.drawCentredString(center, height - 92 * mm, 'This certifies that')

    c.setFillColor(primary)
    c.setFont('Helvetica-Bold', 24)
    c.drawCentredString(center, height - 108 * mm, cert.holder_name)

    c.setFillColor(muted)
    c.setFont('Helvetica', 13)
    c.drawCentredString(center, height - 120 * mm, 'has successfully completed')

    c.setFillColor(ink)
    c.setFont('Helvetica-Bold', 18)
    c.drawCentredString(center, height - 134 * mm, cert.course_title)

    c.setFillColor(muted)
    c.setFont('Helvetica', 10)
    issued = cert.issued_at.strftime('%d %B %Y')
    c.drawCentredString(center, 34 * mm, f'Issued {issued}   ·   Code {cert.code}')
    c.setFont('Helvetica-Oblique', 9)
    c.drawCentredString(center, 27 * mm, f'Verify authenticity at /verify/{cert.code}')

    c.showPage()
    c.save()
    return buffer.getvalue()
