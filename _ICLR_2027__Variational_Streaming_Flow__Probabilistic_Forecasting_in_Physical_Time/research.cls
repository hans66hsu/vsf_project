\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{research}[2026/05/08 Clean research article class]

% =============================================================================
% research.cls
% -----------------------------------------------------------------------------
% A compact, annotated article class for research papers.
%
% Design goals:
%   - Keep the manuscript .tex file focused on content.
%   - Centralize package loading, typography, title/author metadata, theorem
%     environments, color palettes, and common helper macros.
%   - Avoid duplicate package imports in the main document.
%
% Recommended manuscript structure:
%
%   \documentclass{research}
%
%   \title{Paper Title}
%   \author[1]{First Author}
%   \affiliation[1]{Institution}
%   \abstract{...}
%   \correspondence{Name @ \email{name@example.edu}}
%
%   \begin{document}
%   \maketitle
%   ...
%   \end{document}
%
% =============================================================================


% =============================================================================
% 1. Base class
% =============================================================================

\LoadClassWithOptions{article}


% =============================================================================
% 2. Page layout and typography
% =============================================================================

\RequirePackage[
  letterpaper,
  top=1.05in,
  bottom=1.15in,
  left=1.15in,
  right=1.15in,
  headheight=12pt
]{geometry}

% Encoding. These are harmless for pdfLaTeX and useful for portability.
\RequirePackage[T1]{fontenc}
\RequirePackage[utf8]{inputenc}

% \RequirePackage{tgpagella}
% \RequirePackage{libertine}

% Better microtypography and paragraph behavior.
\RequirePackage{microtype}
\microtypesetup{
  protrusion=true,
  expansion=true
}

% Use paragraph spacing instead of paragraph indentation.
\RequirePackage{parskip}

% Reduce overfull boxes without making the document visually loose.
\tolerance=1800
\emergencystretch=2em
\hbadness=1800
\frenchspacing

% Discourage widows and orphans.
\clubpenalty=10000
\widowpenalty=10000

% Avoid extremely short final lines in paragraphs.
\setlength\parfillskip{0pt plus .6\textwidth}


% =============================================================================
% 3. Core packages
% =============================================================================

% General utilities.
\RequirePackage{etoolbox}
\RequirePackage{xparse}

% Graphics and figures.
\RequirePackage[table]{xcolor}
\RequirePackage{graphicx}
%\RequirePackage{subcaption}
\RequirePackage{caption}
\RequirePackage{tikz}
\RequirePackage{adjustbox}
\RequirePackage{overpic}
\RequirePackage{rotating}
\RequirePackage{wrapfig2}

% Tables.
\RequirePackage{booktabs}
\RequirePackage{multirow}
\RequirePackage{array}
\RequirePackage{tabularx}
\RequirePackage{arydshln}
\RequirePackage[table]{xcolor}

% Lists.
\RequirePackage{enumitem}

% Math.
\RequirePackage{amsmath}
\RequirePackage{mathtools}
\RequirePackage{amssymb}
\RequirePackage{amsfonts}
\RequirePackage{amsthm}
\RequirePackage{bm}
\RequirePackage{bbm}
\RequirePackage{nicefrac}

% Algorithms.
%\RequirePackage{algorithm}
%\RequirePackage{algorithmic}
\usepackage{algorithm}
\usepackage{algpseudocode}

% Boxes and verbatim/code blocks.
\RequirePackage[most]{tcolorbox}
\tcbuselibrary{listings,breakable}
\RequirePackage{fancyvrb}
\RequirePackage{fvextra}

% Symbols.
\RequirePackage{pifont}


% =============================================================================
% 4. Bibliography and links
% =============================================================================
%
% Package order matters:
%   natbib -> hyperref -> cleveref
%
% The main document should not load these again.

\RequirePackage[authoryear]{natbib}
\def\bibfont{\small}

\RequirePackage{hyperref}

\definecolor{linkcol}{HTML}{6E4C67}       % muted plum
\definecolor{citecol}{HTML}{8A5A7B}       % dusty magenta
\definecolor{urlcol}{HTML}{3F5E8C}        % muted blue

\hypersetup{
  colorlinks=true,
  linkcolor=linkcol,
  citecolor=citecol,
  urlcolor=urlcol
}

\RequirePackage[noabbrev,nameinlink]{cleveref}


% =============================================================================
% 5. Global colors
% =============================================================================

% Primary document palette.
\definecolor{linkcolor}{HTML}{2A2623}
\definecolor{foregroundcolor}{HTML}{2A2623}
\definecolor{boxbackground}{HTML}{FAF7F2}
\definecolor{boxborder}{HTML}{DDD3C5}

% Neutral utility colors.
\definecolor{lightgray}{gray}{0.9}
\definecolor{sand}{RGB}{248,245,235}
\definecolor{sandborder}{RGB}{220,215,200}
\definecolor{darkblue}{RGB}{40,70,140}
\definecolor{parchment}{RGB}{252,249,240}
\definecolor{parchmentborder}{RGB}{222,215,195}
\definecolor{sage}{RGB}{244,248,244}
\definecolor{sageborder}{RGB}{200,210,200}
\definecolor{lavender}{RGB}{247,246,250}
\definecolor{lavenderborder}{RGB}{210,205,225}

% Table tints.
\definecolor{AbundantTint}{RGB}{232,240,254}
\definecolor{LimitedTint}{RGB}{232,245,233}

% MT-JailBench table palette.
\definecolor{mtEvalA}{HTML}{E9EEF8}
\definecolor{mtEvalB}{HTML}{F0EAF8}
\definecolor{mtFixed}{HTML}{ECEFF3}
\definecolor{mtDynamic}{HTML}{E8F2F1}
\definecolor{mtOnline}{HTML}{E8F4EA}
\definecolor{mtOffline}{HTML}{F7EFE3}
\definecolor{mtResp}{HTML}{E7F2F5}
\definecolor{mtInterp}{HTML}{F6E8EC}
\definecolor{mtTextGrad}{HTML}{EFEAF7}
\definecolor{mtRefusal}{HTML}{F8E9E4}
\definecolor{mtSimilarity}{HTML}{E9F3F4}
\definecolor{mtScore}{HTML}{E8ECF8}


% =============================================================================
% 6. Section and caption formatting
% =============================================================================

\RequirePackage{titlesec}

\newcommand{\sectioncolor}[1]{{\bfseries\color{foregroundcolor} #1}}

% \titleformat*{\section}{\Large\sffamily\bfseries\sectioncolor}
% \titleformat*{\subsection}{\large\sffamily\bfseries\sectioncolor}
% \titleformat*{\subsubsection}{\normalsize\sffamily\bfseries\sectioncolor}
% \titleformat*{\paragraph}{\normalsize\sffamily\bfseries\sectioncolor}

\titleformat*{\section}{\Large\rmfamily\bfseries\sectioncolor}
\titleformat*{\subsection}{\large\rmfamily\bfseries\sectioncolor}
\titleformat*{\subsubsection}{\normalsize\rmfamily\bfseries\sectioncolor}
\titleformat*{\paragraph}{\normalsize\rmfamily\bfseries\sectioncolor}

\DeclareCaptionLabelSeparator{researchsep}{}
\DeclareCaptionFormat{researchcaption}{{\sffamily\textbf{#1 #2}} #3}

\captionsetup{
  singlelinecheck=false,
  format=researchcaption,
  labelsep=researchsep,
  font=small
}



\captionsetup[sub]{
  singlelinecheck=true,
  format=researchcaption,
  labelsep=researchsep,
  font=small
}


% =============================================================================
% 7. Theorem environments
% =============================================================================
%
% These are intentionally simple and article-like. Customize numbering here if
% needed, e.g. \newtheorem{theorem}{Theorem}[section].

\newtheorem{definition}{Definition}
\newtheorem{example}{Example}
\newtheorem{assumption}{Assumption}
\newtheorem{proposition}{Proposition}
\newtheorem{lemma}{Lemma}
\newtheorem{theorem}{Theorem}
\newtheorem{interpretation}{Interpretation}
\newtheorem{remark}{Remark}
\newtheorem{corollary}{Corollary}


% =============================================================================
% 8. Author, affiliation, metadata, and abstract interface
% =============================================================================

\makeatletter

% Helper for building comma- or paragraph-separated lists.
\renewcommand\addtolist[5][]{%
  \begingroup
    \if\relax#3\relax
      \def\sep{}%
    \else
      \def\sep{#5}%
    \fi
    \let\protect\@unexpandable@protect
    \xdef#3{\expandafter{#3}\sep #4[#1]{#2}}%
  \endgroup
}

% Author list.
\newcommand\authorlist{}
% \newcommand\authorformat[2][]{{\sffamily\bfseries #2$^{#1}$}}
\newcommand\authorformat[2][]{{\rmfamily\bfseries #2$^{#1}$}}
\renewcommand\author[2][]{\addtolist[#1]{#2}{\authorlist}{\authorformat}{, }}

% Affiliation list.
\newcommand\affiliationlist{}
\newcommand\affiliationformat[2][]{{\normalsize $^{#1}$#2}}
\newcommand\affiliation[2][]{\addtolist[#1]{#2}{\affiliationlist}{\affiliationformat}{, }}

%\newcommand\affiliation[2][]{%
%  \addtolist[#1]{#2}{\affiliationlist}{\affiliationformat}{\par}
%}

% Contribution notes, e.g. \contribution[*]{Equal contribution}.
\newcommand\contributionlist{}
\newcommand\contributionformat[2][]{{\small $^{#1}$#2}}
\newcommand\contribution[2][]{\addtolist[#1]{#2}{\contributionlist}{\contributionformat}{, }}

% Metadata entries shown below the abstract.
\newcommand\metadatalist{}
\newcommand\metadataformat[2][]{{\small\sffamily\bfseries #1:} {\small #2}}
\newcommand\metadata[2][]{\addtolist[#1]{#2}{\metadatalist}{\metadataformat}{\par\vspace{2mm}}}

% Abstract.
\newcommand\abstractlist{}
\renewcommand{\abstract}[1]{\def\abstractlist{{#1}}}

% Convenience metadata commands.
\newcommand{\email}[1]{\href{mailto:#1}{\texttt{#1}}}
\renewcommand\date[1]{\metadata[Date]{#1}}
\newcommand\correspondence[1]{\metadata[Correspondence]{#1}}

% Title.
\newcommand\titlelist{}
% \renewcommand{\title}[1]{\def\titlelist{{\huge\sffamily\bfseries #1}}}
\renewcommand{\title}[1]{%
  \def\titlelist{{\sffamily\bfseries #1}}%
}
% Appendix helper.
\newcommand{\beginappendix}{%
  \appendix
  {\huge\sffamily\bfseries Appendix\par}
}


%------------------------------------------------------------------------------
% Title bars
% ------------------------------------------------------------------------------

\newcommand{\@toptitlebar}{%
  {\color{linkcolor}\hrule height 0.5pt}
  \vskip 6mm
}

\newcommand{\@bottomtitlebar}{%
  \vskip 6mm
  {\color{linkcolor}\hrule height 0.5pt}
}

% =============================================================================
% 9. Title block
% =============================================================================

\newcommand{\mymaketitle}{%
  {%
    \setlength{\parskip}{0mm}%
    \centering

    \noindent
    \begin{minipage}{\textwidth}
        \centering

        \@toptitlebar

        \vspace{1mm}

        {%
          \fontsize{18}{22}\selectfont
          \titlelist\par
        }

        \vspace{1mm}

        \@bottomtitlebar
    \end{minipage}%

    \vskip 5mm

    {\large \authorlist\par}

    \vskip 3mm

    {\normalsize \affiliationlist\par}

    \vskip 2mm

    {\small \contributionlist\par}
  }

  \vskip 5mm

  \begin{tcolorbox}[
    enhanced,
    width=\linewidth,
    colback=boxbackground,
    colframe=boxborder,
    boxrule=0.6pt,
    arc=3.5mm,
    outer arc=3.5mm,
    left=8mm,
    right=8mm,
    top=3mm,
    bottom=6mm,
    drop fuzzy shadow={black!12!white},
    before skip=0pt,
    after skip=0pt
  ]

    \setlength{\parindent}{0pt}
    \setlength{\parskip}{0.55em}

    {\sffamily\bfseries\color{foregroundcolor} Abstract}

    \vspace{1mm}

    {\color{foregroundcolor}\abstractlist\par}

    \vspace{1mm}

    \ifdefempty{\metadatalist}
      {}
      {%
        \vspace{1mm}
        {\small \metadatalist\par}%
      }

  \end{tcolorbox}

  \vskip 7mm
}

\if@twocolumn
  \renewcommand{\maketitle}{%
    \twocolumn[
      \mymaketitle
      \vskip 0.38cm
    ]%
  }
\else
  \renewcommand{\maketitle}{%
    \mymaketitle
  }
\fi

\makeatother


% =============================================================================
% 10. Table helper macros
% =============================================================================

% Check/cross/not-applicable marks.
\newcommand{\cmark}{\textcolor{green}{\ding{51}}}
\newcommand{\xmark}{\textcolor{red!70!black}{\ding{55}}}
\newcommand{\na}{\textcolor{red!70!black}{--}}

% Attack success-rate color bands.
\newcommand{\asrVH}[1]{\cellcolor{green!20}#1}  % >80
\newcommand{\asrH}[1]{\cellcolor{green!10}#1}   % 60--80
\newcommand{\asrM}[1]{\cellcolor{orange!15}#1}  % 40--60
\newcommand{\asrL}[1]{\cellcolor{red!15}#1}     % 20--40
\newcommand{\asrVL}[1]{\cellcolor{red!25}#1}    % <20

% Delta color bands: color by magnitude of the A-L gap.
\newcommand{\dltZero}[1]{\cellcolor{gray!10}{#1}}      % |Delta| < 2
\newcommand{\dltSmall}[1]{\cellcolor{green!10}{#1}}    % 2--5
\newcommand{\dltMed}[1]{\cellcolor{orange!15}{#1}}     % 5--10
\newcommand{\dltLarge}[1]{\cellcolor{red!15}{#1}}      % 10--20
\newcommand{\dltVLarge}[1]{\cellcolor{red!25}{#1}}     % >20


% =============================================================================
% 11. Manuscript convenience macros
% =============================================================================

\newcommand{\capbox}[1]{%
  \parbox[t]{\linewidth}{\strut #1\strut\par\vspace{0.8\baselineskip}}%
}

\newcommand{\todo}[1]{\textcolor{purple}{#1}}
\newcommand{\sas}{\textsc{SAS}}
\newcommand{\flowmatching}{\textsc{Flow Matching}}

%\usepackage{caption}
% =============================================================================
% End of class
% =============================================================================
