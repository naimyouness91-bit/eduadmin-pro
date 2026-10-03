# -*- coding: utf-8 -*-
"""
Génère le mini rapport PFE EduAdmin Pro — version professionnelle OFPPT.
Ouvrir le .docx dans Word puis : clic droit sur la TOC / LOF / LOT → Mettre à jour les champs.
"""

from docx import Document
from docx.shared import Pt, Cm, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.section import WD_SECTION
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os

OUTPUT = os.path.join(os.path.dirname(__file__), "Mini_Rapport_EduAdmin_Pro.docx")

# ─── Compteurs globaux ───────────────────────────────────────────────────────
_fig_counter = 0
_tbl_counter = 0
_figures_registry = []   # (num, title)
_tables_registry = []    # (num, title)


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPERS OOXML — champs Word (TOC, LOF, LOT, numéros de page, SEQ)
# ═══════════════════════════════════════════════════════════════════════════════

def _set_run_font(run, size=12, bold=False, italic=False, color=None):
    run.font.name = "Times New Roman"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = color


def _paragraph_format(p, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=6):
    pf = p.paragraph_format
    pf.alignment = align
    pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    pf.line_spacing = 1.5
    pf.space_before = Pt(space_before)
    pf.space_after = Pt(space_after)


def _add_field_run(paragraph, instr, placeholder=""):
    """Insère un champ Word complexe dans un paragraphe."""
    run = paragraph.add_run()
    r = run._r

    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    r.append(fld_begin)

    instr_el = OxmlElement("w:instrText")
    instr_el.set(qn("w:space"), "preserve")
    instr_el.text = f" {instr} "
    r.append(instr_el)

    fld_sep = OxmlElement("w:fldChar")
    fld_sep.set(qn("w:fldCharType"), "separate")
    r.append(fld_sep)

    if placeholder:
        t = OxmlElement("w:t")
        t.text = placeholder
        r.append(t)

    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    r.append(fld_end)
    return run


def _add_page_number_footer(section):
    """Pied de page centré avec numéro de page."""
    footer = section.footer
    footer.is_linked_to_previous = False
    p = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    _set_run_font(p.add_run("EduAdmin Pro — Mini Rapport PFE  |  Page "), size=10)
    _add_field_run(p, "PAGE", "1")
    _set_run_font(p.add_run(""), size=10)


def _add_header(section, text="EduAdmin Pro — Plateforme intelligente de gestion scolaire"):
    """En-tête avec titre du projet."""
    header = section.header
    header.is_linked_to_previous = False
    p = header.paragraphs[0] if header.paragraphs else header.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run(text)
    _set_run_font(run, size=9, italic=True, color=RGBColor(0x55, 0x55, 0x55))
    # Ligne de séparation
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "4")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "AAAAAA")
    pBdr.append(bottom)
    pPr.append(pBdr)


def setup_styles(doc):
    styles = doc.styles

    for name, size, bold, color in [
        ("Titre Rapport", 24, True, RGBColor(0x1A, 0x47, 0x7A)),
        ("Sous-titre Rapport", 15, False, RGBColor(0x33, 0x33, 0x33)),
        ("Titre Front Matter", 16, True, RGBColor(0x1A, 0x47, 0x7A)),
    ]:
        try:
            s = styles[name]
        except KeyError:
            s = styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
        s.font.name = "Times New Roman"
        s.font.size = Pt(size)
        s.font.bold = bold
        s.font.color.rgb = color
        s.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER

    normal = styles["Normal"]
    normal.font.name = "Times New Roman"
    normal.font.size = Pt(12)
    pf = normal.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    pf.line_spacing = 1.5
    pf.space_after = Pt(6)
    pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    for level, size, color in [(1, 16, "1A477A"), (2, 14, "1A477A"), (3, 12, "2C5282")]:
        h = styles[f"Heading {level}"]
        h.font.name = "Times New Roman"
        h.font.size = Pt(size)
        h.font.bold = True
        h.font.color.rgb = RGBColor(int(color[:2], 16), int(color[2:4], 16), int(color[4:], 16))
        h.paragraph_format.space_before = Pt(14 if level == 1 else 10)
        h.paragraph_format.space_after = Pt(8 if level == 1 else 6)
        h.paragraph_format.keep_with_next = True

    # Style légende
    try:
        cap = styles["Légende Figure"]
    except KeyError:
        cap = styles.add_style("Légende Figure", WD_STYLE_TYPE.PARAGRAPH)
    cap.font.name = "Times New Roman"
    cap.font.size = Pt(10)
    cap.font.bold = True
    cap.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_before = Pt(4)
    cap.paragraph_format.space_after = Pt(10)

    try:
        tc = styles["Légende Tableau"]
    except KeyError:
        tc = styles.add_style("Légende Tableau", WD_STYLE_TYPE.PARAGRAPH)
    tc.font.name = "Times New Roman"
    tc.font.size = Pt(10)
    tc.font.bold = True
    tc.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    tc.paragraph_format.space_before = Pt(4)
    tc.paragraph_format.space_after = Pt(10)


def set_margins(doc):
    for sec in doc.sections:
        sec.top_margin = Cm(2.5)
        sec.bottom_margin = Cm(2.5)
        sec.left_margin = Cm(3.0)
        sec.right_margin = Cm(2.5)


def add_page_break(doc):
    doc.add_page_break()


def add_body(doc, text, bold=False, italic=False):
    p = doc.add_paragraph()
    run = p.add_run(text)
    _set_run_font(run, bold=bold, italic=italic)
    _paragraph_format(p)
    return p


def add_bullet(doc, text):
    p = doc.add_paragraph(text, style="List Bullet")
    for run in p.runs:
        _set_run_font(run)
    _paragraph_format(p)
    return p


def add_toc(doc):
    """Table des matières automatique (mettre à jour dans Word : F9)."""
    doc.add_paragraph("Table des matières", style="Titre Front Matter")
    doc.add_paragraph()
    p = doc.add_paragraph()
    _add_field_run(p, r'TOC \o "1-3" \h \z \u', "Cliquez droit → Mettre à jour les champs")
    note = doc.add_paragraph()
    run = note.add_run(
        "Note : ouvrir ce document dans Microsoft Word, puis clic droit sur la table "
        "des matières → « Mettre à jour les champs » → « Mettre à jour toute la table »."
    )
    _set_run_font(run, size=10, italic=True, color=RGBColor(0x88, 0x88, 0x88))
    _paragraph_format(note)
    add_page_break(doc)


def add_lof(doc):
    """Liste des figures automatique."""
    doc.add_paragraph("Liste des figures", style="Titre Front Matter")
    doc.add_paragraph()
    p = doc.add_paragraph()
    _add_field_run(p, r'TOC \h \z \c "Figure"', "Cliquez droit → Mettre à jour les champs")
    add_page_break(doc)


def add_lot(doc):
    """Liste des tableaux automatique."""
    doc.add_paragraph("Liste des tableaux", style="Titre Front Matter")
    doc.add_paragraph()
    p = doc.add_paragraph()
    _add_field_run(p, r'TOC \h \z \c "Tableau"', "Cliquez droit → Mettre à jour les champs")
    add_page_break(doc)


def add_figure_caption(doc, title):
    """Légende numérotée avec champ SEQ pour LOF automatique."""
    global _fig_counter
    _fig_counter += 1
    num = _fig_counter
    _figures_registry.append((num, title))

    p = doc.add_paragraph(style="Légende Figure")
    _add_field_run(p, r'SEQ Figure \* ARABIC', str(num))
    run = p.add_run(f" — {title}")
    _set_run_font(run, size=10, bold=True)
    return num


def add_table_caption(doc, title):
    """Légende numérotée pour tableau."""
    global _tbl_counter
    _tbl_counter += 1
    num = _tbl_counter
    _tables_registry.append((num, title))

    p = doc.add_paragraph(style="Légende Tableau")
    run = p.add_run(f"Tableau {num} — {title}")
    _set_run_font(run, size=10, bold=True)
    return num


def add_figure_placeholder(doc, title, description, height_cm=5.5, diagram=False):
    """
    Zone pour capture d'écran ou diagramme UML.
    description : courte explication de ce que la figure doit montrer.
    """
    tbl = doc.add_table(rows=1, cols=1)
    tbl.autofit = False
    cell = tbl.rows[0].cells[0]
    cell.width = Cm(15)

    label = "Diagramme UML" if diagram else "Capture d'écran"
    inner = cell.paragraphs[0]
    inner.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r1 = inner.add_run(f"[ {label} — Insérer l'image ici ]\n\n")
    _set_run_font(r1, size=11, italic=True, color=RGBColor(0x99, 0x99, 0x99))

    r2 = inner.add_run(description)
    _set_run_font(r2, size=10, italic=True, color=RGBColor(0x66, 0x66, 0x66))

    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), "F0F4F8" if diagram else "F5F5F5")
    tcPr.append(shd)

    # Hauteur minimale visuelle
    for _ in range(3):
        cell.add_paragraph("")

    tbl.rows[0].height = Cm(height_cm)
    add_figure_caption(doc, title)
    doc.add_paragraph()


def style_table(table, header=True):
    table.style = "Table Grid"
    if header and table.rows:
        for cell in table.rows[0].cells:
            for p in cell.paragraphs:
                for run in p.runs:
                    _set_run_font(run, size=11, bold=True)
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            tc = cell._tc
            tcPr = tc.get_or_add_tcPr()
            shd = OxmlElement("w:shd")
            shd.set(qn("w:fill"), "1A477A")
            tcPr.append(shd)
            for p in cell.paragraphs:
                for run in p.runs:
                    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    for row in table.rows[1 if header else 0:]:
        for cell in row.cells:
            for p in cell.paragraphs:
                for run in p.runs:
                    _set_run_font(run, size=11)
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT


def add_data_table(doc, headers, rows, caption_title):
    """Tableau avec légende numérotée."""
    add_table_caption(doc, caption_title)
    table = doc.add_table(rows=1, cols=len(headers))
    for i, h in enumerate(headers):
        table.rows[0].cells[i].text = h
    for row_data in rows:
        row = table.add_row().cells
        for i, val in enumerate(row_data):
            row[i].text = str(val)
    style_table(table)
    doc.add_paragraph()
    return table


# ═══════════════════════════════════════════════════════════════════════════════
#  CONTENU — SECTIONS DU RAPPORT
# ═══════════════════════════════════════════════════════════════════════════════

def build_cover(doc):
    for _ in range(5):
        doc.add_paragraph()
    t = doc.add_paragraph("EduAdmin Pro", style="Titre Rapport")
    st = doc.add_paragraph("Plateforme intelligente de gestion scolaire", style="Sous-titre Rapport")
    doc.add_paragraph()
    for line in [
        "Mini rapport de Projet de Fin d'Études (PFE)",
        "Office de la Formation Professionnelle et de la Promotion du Travail — OFPPT",
        "",
        "Réalisé par : [Nom et prénom du stagiaire]",
        "Filière : [Ex. Développement Digital — Option Web Full Stack]",
        "Établissement : [Nom de l'EFP / établissement OFPPT]",
        "",
        "Encadrant pédagogique : [Nom et titre]",
        "Encadrant professionnel : [Nom et titre]",
        "",
        "Année académique 2025 – 2026",
    ]:
        p = doc.add_paragraph(line)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in p.runs:
            _set_run_font(run, size=12)
    add_page_break(doc)


def build_acronyms(doc):
    doc.add_paragraph("Liste des acronymes", style="Titre Front Matter")
    doc.add_paragraph()
    acronyms = [
        ("API", "Application Programming Interface — Interface de programmation applicative"),
        ("CRUD", "Create, Read, Update, Delete — Opérations de base sur les données"),
        ("EFP", "Établissement de Formation Professionnelle"),
        ("ERD", "Entity-Relationship Diagram — Diagramme entité-association"),
        ("IA", "Intelligence Artificielle"),
        ("JSON", "JavaScript Object Notation — Format d'échange de données"),
        ("MVC", "Model-View-Controller — Modèle-Vue-Contrôleur"),
        ("OFPPT", "Office de la Formation Professionnelle et de la Promotion du Travail"),
        ("ORM", "Object-Relational Mapping — Mapping objet-relationnel"),
        ("PDF", "Portable Document Format"),
        ("PFE", "Projet de Fin d'Études"),
        ("REST", "Representational State Transfer — Architecture d'API web"),
        ("SPA", "Single Page Application — Application monopage"),
        ("SQL", "Structured Query Language — Langage de requête structuré"),
        ("TIC", "Technologies de l'Information et de la Communication"),
        ("UML", "Unified Modeling Language — Langage de modélisation unifié"),
        ("2FA", "Two-Factor Authentication — Authentification à deux facteurs"),
    ]
    table = doc.add_table(rows=1, cols=2)
    table.rows[0].cells[0].text = "Acronyme"
    table.rows[0].cells[1].text = "Signification"
    for acr, sig in acronyms:
        row = table.add_row().cells
        row[0].text = acr
        row[1].text = sig
    style_table(table)
    add_page_break(doc)


def build_introduction(doc):
    doc.add_heading("1. Introduction", level=1)

    doc.add_heading("1.1 Contexte général", level=2)
    add_body(doc,
        "La transformation numérique constitue aujourd'hui un levier stratégique pour les "
        "établissements scolaires et les centres de formation. Face à la croissance des effectifs, "
        "à la diversification des parcours pédagogiques et aux attentes accrues des familles, "
        "les institutions éducatives doivent moderniser leurs outils de gestion afin d'assurer "
        "efficacité, traçabilité et qualité de service."
    )
    add_body(doc,
        "Les Technologies de l'Information et de la Communication (TIC) offrent des réponses "
        "concrètes à ces enjeux. Elles permettent de centraliser les données administratives, "
        "d'automatiser les tâches répétitives et de faciliter la communication entre "
        "administrateurs, enseignants, élèves et parents. Dans le contexte marocain, "
        "la politique de digitalisation de l'éducation renforce la pertinence de solutions "
        "web adaptées au terrain."
    )

    doc.add_heading("1.2 Présentation du besoin", level=2)
    add_body(doc,
        "Malgré cette évolution, de nombreux établissements continuent d'utiliser des processus "
        "manuels ou des outils non intégrés : registres papier, fichiers Excel dispersés, "
        "bulletins imprimés individuellement et échanges informels avec les parents. "
        "Ces pratiques engendrent des retards, des erreurs de saisie et une visibilité "
        "limitée sur la performance scolaire globale."
    )
    add_body(doc,
        "Le besoin exprimé est celui d'une plateforme web unifiée, sécurisée et accessible "
        "à distance, capable de couvrir l'ensemble du cycle de vie scolaire : de l'inscription "
        "des élèves à la génération des bulletins, en passant par la gestion des présences, "
        "des emplois du temps et de la communication interne."
    )

    doc.add_heading("1.3 Objectifs du projet", level=2)
    add_body(doc,
        "Ce projet de fin d'études vise la conception et le développement d'EduAdmin Pro, "
        "une plateforme intelligente de gestion scolaire. Les objectifs principaux sont les suivants :"
    )
    for obj in [
        "Centraliser la gestion administrative et pédagogique au sein d'un système unique.",
        "Offrir des espaces personnalisés selon le profil utilisateur (admin, enseignant, élève, parent).",
        "Automatiser les tâches à forte charge cognitive (emplois du temps, bulletins, quiz).",
        "Intégrer des services numériques avancés : intelligence artificielle, visioconférence, analytics.",
        "Garantir la sécurité des données et la traçabilité des opérations sensibles.",
    ]:
        add_bullet(doc, obj)

    add_body(doc,
        "Le livrable attendu est une application web full-stack, composée d'une interface "
        "React moderne et d'une API REST Laravel, prête à être déployée et présentée "
        "lors de la soutenance PFE."
    )

    add_figure_placeholder(
        doc,
        "Page d'accueil (Landing Page) de la plateforme EduAdmin Pro",
        "Capture de la page publique présentant les fonctionnalités clés, "
        "le design moderne et l'appel à l'action pour la connexion.",
        height_cm=4.5,
    )


def build_problematique(doc):
    doc.add_heading("2. Problématique", level=1)
    add_body(doc,
        "La gestion traditionnelle des établissements scolaires souffre de limites structurelles "
        "qui affectent la qualité du service éducatif. L'analyse du contexte a permis "
        "d'identifier six axes problématiques majeurs, détaillés ci-après."
    )

    sections = [
        ("2.1 Gestion des étudiants",
         "L'absence d'un référentiel numérique unique complique l'inscription, le suivi des "
         "dossiers et la réaffectation en classe. Les informations sont dispersées, "
         "la recherche est chronophage et les mises à jour génèrent des incohérences."),
        ("2.2 Gestion des enseignants",
         "Sans outil centralisé, l'affectation des enseignants aux matières et aux classes "
         "manque de visibilité. Le suivi de la charge horaire et des disponibilités "
         "reste approximatif, pénalisant la planification pédagogique."),
        ("2.3 Gestion des notes",
         "La saisie manuelle sur supports non interconnectés augmente les risques d'erreurs "
         "de calcul. La production des bulletins scolaires mobilise des ressources "
         "administratives importantes et ralentit la communication des résultats."),
        ("2.4 Gestion des absences",
         "Le contrôle des présences par feuille papier ou appel oral ne permet ni un suivi "
         "en temps réel, ni une alerte immédiate aux parents. L'établissement dispose "
         "de peu d'indicateurs fiables sur l'absentéisme."),
        ("2.5 Communication avec les parents",
         "Les échanges école-famille reposent souvent sur des canaux informels non tracés "
         "(cahiers, appels téléphoniques). Cette fragmentation nuit à la transparence "
         "et à la réactivité en cas de situation urgente."),
        ("2.6 Organisation des emplois du temps",
         "L'élaboration manuelle des emplois du temps est complexe et sujette aux conflits "
         "de salles et de créneaux. Les modifications de dernière minute sont difficiles "
         "à gérer et à communiquer efficacement."),
    ]
    for heading, text in sections:
        doc.add_heading(heading, level=2)
        add_body(doc, text)

    doc.add_heading("2.7 Formulation de la problématique", level=2)
    add_body(doc,
        "Comment concevoir et développer une plateforme web intégrée, sécurisée et évolutive, "
        "capable de digitaliser l'ensemble des processus de gestion scolaire, de réduire "
        "la charge administrative et d'améliorer la communication entre tous les acteurs "
        "de la communauté éducative ?"
    , italic=True)


def build_solution(doc):
    doc.add_heading("3. Solution proposée", level=1)
    add_body(doc,
        "EduAdmin Pro répond à cette problématique en proposant une plateforme web centralisée, "
        "accessible depuis tout navigateur moderne. Elle regroupe, au sein d'une interface "
        "unique et multilingue (français, anglais, arabe), l'ensemble des modules nécessaires "
        "à la gestion quotidienne d'un établissement scolaire."
    )

    doc.add_heading("3.1 Principes de conception", level=2)
    for p in [
        "Architecture modulaire : chaque fonctionnalité est un module indépendant et interchangeable.",
        "Interface adaptative : l'expérience utilisateur varie selon le rôle connecté.",
        "Séparation des responsabilités : frontend (présentation) et backend (logique métier) découplés.",
        "Extensibilité : possibilité d'ajouter de nouveaux modules sans refonte globale.",
    ]:
        add_bullet(doc, p)

    doc.add_heading("3.2 Modules fonctionnels", level=2)
    modules = [
        ("Gestion des étudiants", "Inscription, profils, affectation aux classes, historique scolaire."),
        ("Gestion des enseignants", "Profils, matières, cours assignés, emploi du temps personnel."),
        ("Gestion des parents", "Liaison parent-enfant, portail familial, notifications."),
        ("Gestion des notes", "Saisie, calcul automatique des moyennes, historique des évaluations."),
        ("Gestion des présences", "Enregistrement des absences/retards, statistiques en temps réel."),
        ("Emplois du temps", "Création manuelle ou automatique, publication, reprogrammation de séances."),
        ("Devoirs", "Création, distribution, soumission en ligne et correction."),
        ("Bulletins PDF", "Génération automatique de bulletins scolaires exportables."),
        ("Assistant IA", "Chat d'étude intelligent (OpenAI) pour accompagner les élèves."),
        ("Quiz IA", "Génération locale de questionnaires à partir du contenu des cours."),
        ("Visioconférence", "Réunions en ligne via Jitsi Meet intégré."),
        ("Notifications", "Alertes automatiques (absences, messages, reprogrammations, annonces)."),
    ]
    for title, desc in modules:
        p = doc.add_paragraph()
        _set_run_font(p.add_run(f"{title} : "), bold=True)
        _set_run_font(p.add_run(desc))
        _paragraph_format(p)

    doc.add_heading("3.3 Valeur ajoutée", level=2)
    add_body(doc,
        "Contrairement aux solutions fragmentées, EduAdmin Pro offre une couverture fonctionnelle "
        "complète : de la gestion administrative de base aux outils pédagogiques avancés "
        "(préparation aux examens, analytics, centre de sécurité). L'intégration native "
        "de l'intelligence artificielle et de la visioconférence distingue cette solution "
        "dans le paysage des systèmes de gestion scolaire."
    )

    add_figure_placeholder(
        doc,
        "Tableau de bord principal selon le rôle utilisateur",
        "Capture du dashboard affichant les indicateurs clés (effectifs, notes, absences, "
        "événements à venir) adaptés au profil connecté.",
        height_cm=4.5,
    )


def build_technologies(doc):
    doc.add_heading("4. Technologies utilisées", level=1)
    add_body(doc,
        "Le choix technologique a été guidé par des critères de maturité, de performance, "
        "de documentation, de communauté active et de compatibilité avec les compétences "
        "acquises durant la formation OFPPT."
    )

    add_data_table(doc,
        ["Couche", "Technologie", "Version", "Rôle"],
        [
            ["Frontend", "React", "18.x", "Construction de l'interface utilisateur (SPA)"],
            ["Frontend", "Vite", "5.x", "Bundler et serveur de développement"],
            ["Frontend", "Tailwind CSS", "3.x", "Framework CSS utilitaire responsive"],
            ["Frontend", "Zustand", "4.x", "Gestion d'état (session, préférences)"],
            ["Frontend", "Chart.js", "4.x", "Graphiques et visualisations analytics"],
            ["Backend", "Laravel", "10.x", "Framework PHP MVC, API REST"],
            ["Backend", "Laravel Sanctum", "3.x", "Authentification API par token"],
            ["Backend", "PHPUnit", "10.x", "Tests automatisés backend"],
            ["Base de données", "MySQL", "8.x", "Stockage relationnel des données"],
            ["IA", "OpenAI API", "—", "Assistant d'étude, préparation aux examens"],
            ["IA", "Moteur local", "—", "Génération de quiz sans dépendance externe"],
            ["Sécurité", "Google2FA", "—", "Authentification à deux facteurs"],
            ["Visio", "Jitsi Meet", "—", "Visioconférence open source"],
            ["Utilitaire", "QR Code", "—", "Authentification rapide et partage"],
        ],
        "Stack technologique d'EduAdmin Pro",
    )

    doc.add_heading("4.1 Justification des choix", level=2)
    add_body(doc,
        "React et Laravel constituent un duo éprouvé pour le développement full-stack. "
        "React offre une interface réactive par composants ; Laravel apporte une structure "
        "MVC rigoureuse, un ORM puissant (Eloquent) et un écosystème complet (migrations, "
        "seeders, tests). MySQL assure un stockage relationnel fiable, adapté aux entités "
        "scolaires fortement interconnectées (utilisateurs, cours, notes, emplois du temps)."
    )
    add_body(doc,
        "L'intégration de services spécialisés (OpenAI, Jitsi, Google2FA) permet d'enrichir "
        "la plateforme sans alourdir le cœur applicatif. Le moteur local de quiz garantit "
        "un fonctionnement autonome même en l'absence de connexion à une API externe."
    )


def build_architecture(doc):
    doc.add_heading("5. Architecture générale", level=1)
    add_body(doc,
        "EduAdmin Pro adopte une architecture en couches (layered architecture) séparant "
        "clairement la présentation, la logique métier et la persistance. Ce découplage "
        "facilite la maintenance, les tests unitaires et l'évolution progressive du système."
    )

    doc.add_heading("5.1 Flux de communication", level=2)
    add_body(doc, "Le schéma ci-dessous illustre le flux principal de l'application :")
    for step in [
        "Utilisateur (navigateur web)",
        "↓",
        "Frontend React — Single Page Application (SPA)",
        "↓",
        "API REST Laravel — Authentification Sanctum (token Bearer)",
        "↓",
        "Base de données MySQL — Stockage relationnel",
    ]:
        p = doc.add_paragraph(step)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if step == "↓" else WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            _set_run_font(run, bold=(step != "↓"))

    add_figure_placeholder(
        doc,
        "Diagramme d'architecture générale du système",
        "Schéma en couches montrant : Client (React/Vite) → API Gateway (Laravel) → "
        "Services métier → MySQL, avec les connexions aux services externes (OpenAI, Jitsi).",
        height_cm=6, diagram=True,
    )

    doc.add_heading("5.2 Modélisation UML", level=2)
    add_body(doc,
        "La modélisation du système repose sur les diagrammes UML standards, "
        "présentés dans les figures suivantes. Ces artefacts facilitent la compréhension "
        "du système lors de la soutenance et constituent une base réutilisable "
        "pour le rapport final."
    )

    diagrams = [
        ("Diagramme de cas d'utilisation",
         "Acteurs (Admin, Enseignant, Étudiant, Parent) et cas d'utilisation principaux "
         "(gérer notes, consulter emploi du temps, générer bulletin, etc.)."),
        ("Diagramme de classes",
         "Entités principales (User, Student, Teacher, Course, Grade, Timetable, Assignment) "
         "et leurs relations (associations, héritages)."),
        ("Diagramme entité-association (ERD)",
         "Modèle de données relationnel : tables, clés primaires, clés étrangères "
         "et cardinalités (users, students, courses, grades, timetable_entries…)."),
        ("Diagramme de séquence — Authentification",
         "Flux d'authentification : saisie identifiants → validation Laravel Sanctum → "
         "émission du token → accès au dashboard selon le rôle."),
    ]
    for title, desc in diagrams:
        add_figure_placeholder(doc, title, desc, height_cm=5.5, diagram=True)

    doc.add_heading("5.3 Organisation du backend", level=2)
    for item in [
        "Controllers — Réception des requêtes HTTP, validation, réponses JSON.",
        "Services — Logique métier (TimetableService, BulletinService, NotificationService…).",
        "Models — Entités Eloquent ORM avec relations et scopes.",
        "Migrations / Seeders — Versionnement et données de démonstration.",
        "Middleware — Authentification, autorisation par rôle, rate limiting.",
        "Tests Feature — Validation automatisée des endpoints critiques.",
    ]:
        add_bullet(doc, item)

    doc.add_heading("5.4 Organisation du frontend", level=2)
    add_body(doc,
        "Le frontend React est structuré en composants réutilisables (design system), "
        "pages métier, hooks personnalisés et services API centralisés. La navigation "
        "est filtrée dynamiquement selon le rôle. L'internationalisation (i18n) couvre "
        "le français, l'anglais et l'arabe. Zustand gère la session et les préférences "
        "(thème clair/sombre, langue)."
    )


def build_fonctionnalites(doc):
    doc.add_heading("6. Fonctionnalités principales", level=1)
    add_body(doc,
        "EduAdmin Pro propose une expérience différenciée selon le profil de l'utilisateur. "
        "Quatre rôles principaux structurent les droits d'accès et les fonctionnalités disponibles. "
        "Le tableau ci-dessous en donne une vue synthétique ; chaque rôle est ensuite détaillé."
    )

    add_data_table(doc,
        ["Fonctionnalité", "Admin", "Enseignant", "Étudiant", "Parent"],
        [
            ["Gestion des utilisateurs", "✓", "—", "—", "—"],
            ["Gestion des cours", "✓", "Consult.", "Consult.", "—"],
            ["Saisie des notes", "✓", "✓", "Consult.", "Consult."],
            ["Gestion des absences", "✓", "✓", "Consult.", "Consult."],
            ["Emploi du temps", "✓", "✓", "Consult.", "Consult."],
            ["Devoirs", "✓", "✓", "✓", "Consult."],
            ["Bulletins PDF", "✓", "Consult.", "Consult.", "Consult."],
            ["Assistant / Quiz IA", "—", "✓", "✓", "—"],
            ["Visioconférence", "✓", "✓", "✓", "✓"],
            ["Messagerie", "✓", "✓", "✓", "✓"],
            ["Analytics", "✓", "Partiel", "—", "—"],
            ["Sécurité / Sauvegarde", "✓", "—", "—", "—"],
        ],
        "Matrice des fonctionnalités par rôle",
    )

    # ── Admin ──
    doc.add_heading("6.1 Rôle Administrateur (Admin)", level=2)
    add_body(doc,
        "L'administrateur dispose d'un contrôle global sur l'établissement. Il supervise "
        "l'ensemble des modules et intervient sur les opérations sensibles. Son tableau de bord "
        "centralise les indicateurs clés : effectifs, taux de présence, moyennes générales "
        "et activité récente du système."
    )
    add_body(doc, "Principales responsabilités :")
    for f in [
        "Gestion complète des étudiants, enseignants et parents (création, modification, suppression).",
        "Configuration des cours, classes, matières et affectations pédagogiques.",
        "Supervision des notes, absences et validation des bulletins scolaires.",
        "Création, génération automatique et publication des emplois du temps.",
        "Approbation ou rejet des demandes de reprogrammation de séances.",
        "Accès aux analytics, journaux d'activité, centre de sécurité et sauvegardes.",
        "Import/export de données (Excel) et gestion des annonces institutionnelles.",
    ]:
        add_bullet(doc, f)

    add_figure_placeholder(
        doc,
        "Interface administrateur — Module de gestion des étudiants",
        "Capture montrant la liste paginée des étudiants, les filtres de recherche, "
        "les actions CRUD et le formulaire de création/modification.",
        height_cm=4.5,
    )

    # ── Teacher ──
    doc.add_heading("6.2 Rôle Enseignant (Teacher)", level=2)
    add_body(doc,
        "L'enseignant accède à un espace dédié centré sur ses activités pédagogiques. "
        "Il ne voit que les données relatives à ses classes et à ses cours assignés, "
        "conformément au principe de moindre privilège."
    )
    add_body(doc, "Principales responsabilités :")
    for f in [
        "Consultation de son emploi du temps et soumission de demandes de reprogrammation.",
        "Saisie et modification des notes pour ses classes.",
        "Enregistrement des présences, absences et retards.",
        "Création, distribution et correction des devoirs.",
        "Génération de quiz IA à partir du contenu de ses cours.",
        "Communication via messagerie interne et organisation de réunions Jitsi.",
        "Consultation de son tableau de bord pédagogique (moyennes, taux de présence).",
    ]:
        add_bullet(doc, f)

    add_figure_placeholder(
        doc,
        "Interface enseignant — Emploi du temps et reprogrammation de séances",
        "Capture du module emploi du temps enseignant avec la grille hebdomadaire "
        "et le modal de demande de reprogrammation (choix de créneau libre, motif).",
        height_cm=4.5,
    )

    # ── Student ──
    doc.add_heading("6.3 Rôle Étudiant (Student)", level=2)
    add_body(doc,
        "L'étudiant bénéficie d'un portail centré sur son parcours scolaire. "
        "L'interface privilégie la lisibilité et l'accès rapide aux informations "
        "essentielles : notes, devoirs, emploi du temps et outils d'aide à l'apprentissage."
    )
    add_body(doc, "Principales fonctionnalités accessibles :")
    for f in [
        "Consultation de l'emploi du temps et du calendrier scolaire.",
        "Accès aux notes, bulletins et historique des évaluations.",
        "Visualisation et soumission en ligne des devoirs.",
        "Utilisation de l'assistant IA d'étude et du module de préparation aux examens.",
        "Participation aux quiz générés par l'IA.",
        "Messagerie avec enseignants et consultation des annonces.",
        "Participation aux réunions virtuelles Jitsi depuis la plateforme.",
    ]:
        add_bullet(doc, f)

    add_figure_placeholder(
        doc,
        "Interface étudiant — Assistant IA d'étude",
        "Capture du module de chat IA montrant la conversation contextuelle, "
        "les suggestions de révision et l'interface de préparation aux examens.",
        height_cm=4.5,
    )

    # ── Parent ──
    doc.add_heading("6.4 Rôle Parent (Parent)", level=2)
    add_body(doc,
        "Le parent accède à un portail familial sécurisé, lié au profil de son ou ses enfants. "
        "Ce module renforce la transparence école-famille et permet un suivi proactif "
        "de la scolarité sans déplacement physique."
    )
    add_body(doc, "Principales fonctionnalités accessibles :")
    for f in [
        "Consultation des notes et bulletins scolaires de l'enfant.",
        "Suivi des absences et retards en temps réel avec notifications.",
        "Visualisation de l'emploi du temps et du calendrier des événements.",
        "Réception de notifications (absences, messages, annonces).",
        "Communication directe avec l'établissement via la messagerie interne.",
    ]:
        add_bullet(doc, f)

    add_figure_placeholder(
        doc,
        "Interface parent — Portail de suivi de la scolarité",
        "Capture du dashboard parent affichant les notes récentes, le taux de présence "
        "et les notifications de l'enfant sélectionné.",
        height_cm=4.5,
    )


def build_securite(doc):
    doc.add_heading("5.6 Sécurité du système", level=2)
    add_body(doc,
        "La sécurité constitue un pilier fondamental d'EduAdmin Pro. Le système intègre "
        "plusieurs mécanismes complémentaires pour protéger les données sensibles "
        "et garantir un accès contrôlé aux fonctionnalités."
    )

    doc.add_heading("5.6.1 Authentification", level=3)
    add_body(doc,
        "L'authentification repose sur Laravel Sanctum, qui émet un token Bearer "
        "lors de la connexion. Ce token est transmis dans l'en-tête de chaque requête API. "
        "La session expire automatiquement après une période d'inactivité configurable."
    )
    for item in [
        "Connexion par email et mot de passe avec hachage bcrypt.",
        "Authentification à deux facteurs (Google2FA) activable par l'utilisateur.",
        "Codes QR pour une connexion rapide et sécurisée.",
        "Journalisation des événements de connexion (Login Events).",
        "Protection contre les tentatives de connexion massives (rate limiting).",
    ]:
        add_bullet(doc, item)

    doc.add_heading("5.6.2 Gestion des rôles et permissions", level=3)
    add_body(doc,
        "Le système implémente un contrôle d'accès basé sur les rôles (RBAC). "
        "Cinq profils sont définis : super administrateur, administrateur, enseignant, "
        "étudiant et parent. Chaque route API et chaque élément de navigation frontend "
        "sont filtrés selon le rôle de l'utilisateur connecté."
    )
    add_body(doc,
        "Des middlewares Laravel et des composants React (ProtectedRoute) appliquent "
        "cette politique de manière cohérente côté serveur et côté client, "
        "conformément au principe de défense en profondeur."
    )

    doc.add_heading("5.6.3 Protection des données", level=3)
    for item in [
        "Validation stricte des entrées côté serveur (Form Requests Laravel).",
        "Protection CSRF et XSS sur les formulaires et les affichages.",
        "Soft delete sur les entités sensibles (utilisateurs, dossiers).",
        "Journal d'activité (Activity Log) pour la traçabilité des opérations.",
        "Module de sauvegarde et restauration des données (Backup & Restore).",
        "Centre de sécurité dédié pour la supervision et la configuration.",
    ]:
        add_bullet(doc, item)


def build_tests(doc):
    doc.add_heading("7.4 Tests et validation", level=2)
    add_body(doc,
        "La qualité du logiciel est assurée par une stratégie de tests automatisés "
        "ciblant les modules critiques de l'API backend. Les tests sont exécutés "
        "via PHPUnit et intégrés au workflow de développement."
    )

    doc.add_heading("7.4.1 Tests automatisés (PHPUnit)", level=3)
    add_data_table(doc,
        ["Suite de tests", "Module couvert", "Scénarios principaux"],
        [
            ["CourseAiQuizTest", "Quiz IA", "Génération locale, validation, soumission, scoring"],
            ["TimetableTest", "Emploi du temps", "Génération auto, publication, conflits de créneaux"],
            ["TimetableRescheduleTest", "Reprogrammation", "Demande enseignant, approbation admin, notifications"],
            ["CourseAuthorizationTest", "Autorisations", "Accès par rôle aux ressources cours"],
            ["StudentBulletinTest", "Bulletins", "Génération, workflow, export PDF"],
            ["AiExamPrepTest", "Préparation examens", "Génération de contenu, validation des réponses"],
        ],
        "Suites de tests automatisés backend",
    )

    doc.add_heading("7.4.2 Stratégie de validation", level=3)
    for item in [
        "Tests Feature : validation des endpoints API avec base de données de test.",
        "Données de démonstration (Seeders) pour les tests manuels et la soutenance.",
        "Vérification des autorisations par rôle sur chaque endpoint sensible.",
        "Tests de non-régression lors de l'ajout de nouvelles fonctionnalités.",
    ]:
        add_bullet(doc, item)

    add_body(doc,
        "Les tests automatisés garantissent la stabilité des fonctionnalités essentielles "
        "et constituent une base solide pour les évolutions futures du système."
    )


def build_resultats(doc):
    doc.add_heading("7. Résultats obtenus", level=1)
    add_body(doc,
        "Le développement d'EduAdmin Pro a abouti à une plateforme fonctionnelle, testée "
        "et prête à être déployée. L'ensemble des modules prévus au cahier des charges "
        "a été implémenté avec succès."
    )

    doc.add_heading("7.1 Avantages du système", level=2)
    avantages = [
        ("Centralisation", "Toutes les données scolaires sont regroupées dans une base unique, éliminant la dispersion des fichiers."),
        ("Gain de temps", "Automatisation des emplois du temps, bulletins PDF et quiz IA."),
        ("Communication", "Messagerie intégrée, notifications automatiques et portail parent."),
        ("Automatisation", "Modules IA et génération automatique libérant du temps pour le suivi pédagogique."),
        ("Sécurité", "2FA, RBAC, journal d'activité et sauvegardes garantissent l'intégrité des données."),
        ("Suivi pédagogique", "Analytics, bulletins numériques et suivi des absences en temps réel."),
    ]
    for title, desc in avantages:
        p = doc.add_paragraph()
        _set_run_font(p.add_run(f"{title} : "), bold=True)
        _set_run_font(p.add_run(desc))
        _paragraph_format(p)

    doc.add_heading("7.2 État d'avancement des modules", level=2)
    add_data_table(doc,
        ["Module", "Description", "Statut"],
        [
            ["Gestion utilisateurs", "CRUD étudiants, enseignants, parents", "Opérationnel"],
            ["Notes et bulletins", "Saisie, calcul, export PDF", "Opérationnel"],
            ["Présences", "Enregistrement et statistiques", "Opérationnel"],
            ["Emploi du temps", "Génération auto, reprogrammation", "Opérationnel"],
            ["Devoirs", "Création, soumission, correction", "Opérationnel"],
            ["Assistant IA", "Chat d'étude via OpenAI", "Opérationnel"],
            ["Quiz IA", "Génération locale sans API externe", "Opérationnel"],
            ["Visioconférence", "Réunions Jitsi Meet", "Opérationnel"],
            ["Analytics", "Tableaux de bord et graphiques", "Opérationnel"],
            ["Sécurité", "2FA, logs, sauvegarde", "Opérationnel"],
        ],
        "État d'avancement des modules au terme du projet",
    )

    doc.add_heading("7.3 Indicateurs techniques", level=2)
    add_body(doc,
        "La plateforme comprend plus d'une centaine de routes API, une interface frontend "
        "modulaire avec plus de vingt pages fonctionnelles, un support multilingue complet "
        "(français, anglais, arabe) et une couverture de tests backend sur les modules "
        "critiques. L'application est déployable en environnement local ou serveur "
        "avec des prérequis standards (PHP 8.2, Node.js 18, MySQL 8)."
    )

    add_figure_placeholder(
        doc,
        "Module Analytics — Tableaux de bord et statistiques",
        "Capture du module analytics montrant les graphiques de performance (notes, "
        "présences, effectifs) et les filtres par période.",
        height_cm=4.5,
    )

    doc.add_heading("7.5 Retour d'expérience", level=2)
    add_body(doc,
        "Ce projet a permis de mettre en pratique l'ensemble des compétences acquises "
        "durant la formation OFPPT : analyse des besoins, modélisation UML, développement "
        "full-stack, tests, sécurisation et rédaction technique. La gestion d'un projet "
        "d'envergure avec de multiples modules interdépendants a renforcé l'autonomie, "
        "la rigueur méthodologique et la capacité de résolution de problèmes complexes."
    )


def build_conclusion(doc):
    doc.add_heading("8. Conclusion", level=1)

    doc.add_heading("8.1 Bilan du projet", level=2)
    add_body(doc,
        "Le projet EduAdmin Pro a permis de concevoir et de développer une plateforme "
        "complète de gestion scolaire, répondant aux problématiques identifiées en amont. "
        "L'objectif de centralisation des processus administratifs et pédagogiques a été "
        "atteint grâce à une architecture moderne, modulaire et sécurisée."
    )
    add_body(doc,
        "L'intégration de l'intelligence artificielle, de la visioconférence et des outils "
        "d'analyse distingue cette solution des systèmes classiques. Le respect des bonnes "
        "pratiques (tests automatisés, séparation des responsabilités, internationalisation) "
        "garantit la qualité et la maintenabilité du code produit."
    )

    doc.add_heading("8.2 Perspectives d'amélioration", level=2)
    add_body(doc,
        "Plusieurs axes d'évolution peuvent enrichir la plateforme dans le cadre "
        "du rapport final ou d'un déploiement en production :"
    )
    perspectives = [
        ("Application mobile", "Développement d'une PWA ou application native (Android/iOS) pour un accès nomade."),
        ("Notifications push", "Alertes en temps réel sur mobile pour absences, messages et événements urgents."),
        ("IA avancée", "Parcours personnalisés, détection précoce des difficultés, analyse prédictive des résultats."),
        ("Tableaux de bord intelligents", "Dashboards adaptatifs avec recommandations pédagogiques automatiques."),
        ("Intégration SMS", "Notifications par SMS aux parents pour les alertes immédiates."),
        ("Module de paiement", "Gestion des frais de scolarité et suivi des paiements en ligne."),
    ]
    for title, desc in perspectives:
        p = doc.add_paragraph()
        _set_run_font(p.add_run(f"{title} : "), bold=True)
        _set_run_font(p.add_run(desc))
        _paragraph_format(p)

    doc.add_heading("8.3 Mot de fin", level=2)
    add_body(doc,
        "EduAdmin Pro constitue une base solide et évolutive pour la digitalisation "
        "des établissements scolaires. En combinant gestion administrative, outils "
        "pédagogiques innovants et technologies modernes, cette plateforme contribue "
        "à l'amélioration de la qualité du service éducatif et à la modernisation "
        "du secteur de la formation professionnelle au Maroc."
    )


def build_bibliography(doc):
    add_page_break(doc)
    doc.add_heading("Bibliographie", level=1)
    references = [
        "Laravel Documentation — https://laravel.com/docs/10.x",
        "React Documentation — https://react.dev/",
        "Tailwind CSS Documentation — https://tailwindcss.com/docs",
        "Vite Documentation — https://vitejs.dev/",
        "MySQL 8.0 Reference Manual — https://dev.mysql.com/doc/",
        "OpenAI API Reference — https://platform.openai.com/docs/",
        "Jitsi Meet Handbook — https://jitsi.github.io/handbook/",
        "Google2FA (Pragmarx) — https://github.com/antonioribeiro/google2fa",
        "Fowler M., Patterns of Enterprise Application Architecture, Addison-Wesley, 2002.",
        "Booch G., Rumbaugh J., Jacobson I., The Unified Modeling Language User Guide, Addison-Wesley, 2005.",
        "OFPPT — Référentiel de formation Développement Digital, Option Web Full Stack.",
        "Chart.js Documentation — https://www.chartjs.org/docs/latest/",
    ]
    for i, ref in enumerate(references, 1):
        p = doc.add_paragraph()
        _set_run_font(p.add_run(f"[{i}] {ref}"), size=11)
        _paragraph_format(p, space_after=4)


def build_remerciements(doc):
    add_page_break(doc)
    doc.add_heading("Remerciements", level=1)
    add_body(doc,
        "[ Insérer ici vos remerciements envers votre encadrant pédagogique, "
        "votre encadrant professionnel, l'équipe pédagogique de votre établissement "
        "OFPPT et toute personne ayant contribué à la réalisation de ce projet. ]",
        italic=True,
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  ASSEMBLAGE DU DOCUMENT
# ═══════════════════════════════════════════════════════════════════════════════

def build_document():
    global _fig_counter, _tbl_counter, _figures_registry, _tables_registry
    _fig_counter = _tbl_counter = 0
    _figures_registry = []
    _tables_registry = []

    doc = Document()
    setup_styles(doc)
    set_margins(doc)

    # ── Section 1 : Page de garde (sans en-tête/pied de page) ──
    section_cover = doc.sections[0]
    section_cover.different_first_page_header_footer = True

    build_cover(doc)

    # ── Section 2 : Pages liminaires + corps (avec en-tête/pied de page) ──
    new_section = doc.add_section(WD_SECTION.NEW_PAGE)
    new_section.different_first_page_header_footer = False
    _add_header(new_section)
    _add_page_number_footer(new_section)

    # Pages liminaires
    add_toc(doc)
    add_lof(doc)
    add_lot(doc)
    build_acronyms(doc)

    # Corps du rapport
    build_introduction(doc)
    build_problematique(doc)
    build_solution(doc)
    build_technologies(doc)
    build_architecture(doc)
    build_securite(doc)
    build_fonctionnalites(doc)
    build_resultats(doc)
    build_tests(doc)
    build_conclusion(doc)
    build_bibliography(doc)
    build_remerciements(doc)

    doc.save(OUTPUT)
    print(f"Document genere : {OUTPUT}")
    print(f"  Figures : {_fig_counter}  |  Tableaux : {_tbl_counter}")
    print("  Ouvrir dans Word > Mettre a jour les champs (TOC, LOF, LOT) : clic droit > Mettre a jour")


if __name__ == "__main__":
    build_document()
