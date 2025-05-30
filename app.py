import streamlit as st 
st.set_page_config(page_title="Skill Gap Analyzer", layout="wide")

import pandas as pd
import plotly.graph_objects as go
import json
import io
import re
import PyPDF2
from fpdf import FPDF
from collections import Counter


st.markdown("""
    <style>
        .main { background-color: #f8f9fa; }
        .reportview-container .markdown-text-container { padding-top: 2rem; }
        .sidebar .sidebar-content { background-color: #f1f3f6; }
        .stButton>button {
            background-color: #4CAF50;
            color: white;
            padding: 0.4em 1em;
            border-radius: 8px;
        }
        .stMarkdown h3 {
            color: #30475e;
        }
        .stMarkdown h2 {
            color: #222831;
        }
    </style>
""", unsafe_allow_html=True)


with open("job_roles.json", "r") as file:
    job_roles_data = json.load(file)


for role in job_roles_data:
    job_roles_data[role] = {s.strip().title(): p for s, p in job_roles_data[role].items()}


resource_links = {
       "Powerpoint": "https://edu.gcfglobal.org/en/powerpoint/",
  "Apis": "https://www.geeksforgeeks.org/what-is-an-api/",
  "Python": "https://www.learnpython.org/",
  "SQL": "https://www.sqlcourse.com/",
  "Tensorflow": "https://www.tensorflow.org/learn",
  "Pandas": "https://pandas.pydata.org/docs/",
  "Math": "https://www.khanacademy.org/math",
  "NLP": "https://www.coursera.org/learn/natural-language-processing",
  "Deep Learning": "https://www.deeplearning.ai/",
  "HTML": "https://www.w3schools.com/html/",
  "CSS": "https://www.w3schools.com/css/",
  "JavaScript": "https://www.javascript.com/",
  "React": "https://reactjs.org/",
  "Linux": "https://ubuntu.com/tutorials",
  "Docker": "https://docker-curriculum.com/",
  "CI/CD": "https://www.atlassian.com/continuous-delivery",
  "Cloud": "https://www.aws.training/",
  "Figma": "https://www.figma.com/resources/learn-design/",
  "Excel": "https://exceljet.net/",
  "PowerBI": "https://learn.microsoft.com/en-us/training/powerplatform/power-bi/",
  "Django": "https://www.djangoproject.com/start/",
  "Databases": "https://www.codecademy.com/learn/learn-sql",
  "Aws": "https://aws.amazon.com/training/",
  "Azure": "https://learn.microsoft.com/en-us/training/azure/",
  "Networking": "https://www.geeksforgeeks.org/computer-network-tutorials/",
  "Security": "https://www.coursera.org/learn/introduction-cybersecurity",
  "Communication": "https://www.coursera.org/learn/wharton-communication",
  "Strategy": "https://www.coursera.org/learn/strategic-management",
  "JIRA": "https://www.atlassian.com/software/jira/guides",
  "Agile": "https://www.agilealliance.org/agile101/",
  "Tableau": "https://public.tableau.com/en-us/s/resources",
  "User Research": "https://www.interaction-design.org/courses/user-research-methods",
  "Adobe XD": "https://helpx.adobe.com/xd/tutorials.html",
  "Prototyping": "https://uxdesign.cc/prototyping-methods-and-tools-820f40830f15",
  "Photoshop": "https://helpx.adobe.com/photoshop/tutorials.html",
  "Illustrator": "https://helpx.adobe.com/illustrator/tutorials.html",
  "Creativity": "https://www.skillshare.com/en/classes/Creativity-Master-Class/2050085100",
  "InDesign": "https://helpx.adobe.com/indesign/tutorials.html",
  "SEO": "https://moz.com/beginners-guide-to-seo",
  "Google Ads": "https://skillshop.exceedlms.com/student/catalog/list?category_ids=53-google-ads",
  "Content Marketing": "https://contentmarketinginstitute.com/what-is-content-marketing/",
  "Analytics": "https://analytics.google.com/analytics/academy/",
  "Backlinking": "https://ahrefs.com/blog/get-backlinks/",
  "Keyword Research": "https://moz.com/blog/keyword-research-beginner",
  "Cybersecurity": "https://www.cybrary.it/",
  "SIEM": "https://www.splunk.com/en_us/resources.html",
  "Ethical Hacking": "https://www.freecodecamp.org/news/learn-ethical-hacking/",
  "Accounting": "https://www.accountingcoach.com/",
  "Valuation": "https://www.investopedia.com/terms/v/valuation.asp",
  "PowerPoint": "https://learn.microsoft.com/en-us/powerpoint/",
  "Finance": "https://www.khanacademy.org/economics-finance-domain/core-finance",
  "Biology": "https://www.khanacademy.org/science/biology",
  "Data Analysis": "https://www.coursera.org/specializations/data-analysis",
  "Genomics": "https://www.edx.org/course/introduction-to-genomics",
  "Clinical Trials": "https://www.coursera.org/learn/clinical-trials",
  "Regulations": "https://www.coursera.org/learn/health-law-ethics",
  "Curriculum Design": "https://www.coursera.org/learn/instructional-design",
  "Storyboarding": "https://www.udemy.com/course/storyboarding-for-animation/",
  "Learning Theories": "https://www.coursera.org/learn/learning-theories",
  "Articulate 360": "https://community.articulate.com/series/getting-started-with-articulate-360",
  "Legal Research": "https://www.coursera.org/learn/legal-research",
  "Drafting": "https://www.coursera.org/learn/legal-drafting",
  "Public Speaking": "https://www.coursera.org/learn/public-speaking",
  "Legal Ethics": "https://www.coursera.org/learn/legal-ethics",
  "Data Interpretation": "https://www.udemy.com/course/data-interpretation-masterclass/",
  "Policy Drafting": "https://www.coursera.org/learn/public-policy",
  "Stakeholder Engagement": "https://www.futurelearn.com/courses/stakeholder-engagement",
  "Economics": "https://www.khanacademy.org/economics-finance-domain/microeconomics",
  "Lab Techniques": "https://www.edx.org/course/basic-analytical-chemistry",
  "Spectroscopy": "https://www.coursera.org/learn/spectroscopy",
  "Chemical Safety": "https://www.coursera.org/learn/laboratory-safety",
  "Research Writing": "https://www.coursera.org/learn/research-paper-writing",
  "CAD": "https://www.autodesk.com/education/edu-software/overview?sorting=featured&page=1",
  "Thermodynamics": "https://www.coursera.org/learn/thermodynamics",
  "MATLAB": "https://www.mathworks.com/learn/tutorials/matlab-onramp.html",
  "Fluid Mechanics": "https://nptel.ac.in/courses/112/105/112105171/",
  "Writing": "https://www.coursera.org/learn/academic-english-writing",
  "Editing": "https://www.udemy.com/course/editing-and-proofreading/",
  "Research": "https://www.coursera.org/learn/information-literacy",
  "Interviewing": "https://www.udemy.com/course/interviewing-skills/",
  "Fact-checking": "https://www.poynter.org/ifcn/faq/",
  "Video Editing": "https://www.adobe.com/products/premiere.html",
  "Tally": "https://tallysolutions.com/learn/",
  "Taxation": "https://www.incometax.gov.in/iec/foportal/",
  "ICD-10": "https://www.aapc.com/icd-10/",
  "Anatomy": "https://www.visiblebody.com/learn/atlas",
  "CPT Coding": "https://www.ama-assn.org/delivering-care/cpt",
  "Medical Terminology": "https://www.coursera.org/learn/medical-terminology",
  "Inventory Management": "https://www.coursera.org/learn/inventory-management",
  "Customer Service": "https://www.coursera.org/learn/customer-service",
  "Sales Strategy": "https://www.coursera.org/learn/sales-strategy",
  "Team Leadership": "https://www.coursera.org/learn/teamwork-skills",
  "Quantum Mechanics": "https://www.edx.org/course/quantum-mechanics",
  "Mathematical Modelling": "https://www.coursera.org/learn/mathematical-modeling",
  "Unity": "https://learn.unity.com/",
  "C#": "https://learn.microsoft.com/en-us/dotnet/csharp/",
  "Game Physics": "https://www.udemy.com/course/game-physics/",
  "Graphics Optimization": "https://learnopengl.com/Advanced-OpenGL/Face-culling",
  "Flight Navigation": "https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/phak",
  "Aviation Safety": "https://www.skybrary.aero/articles/aviation-safety",
  "Aircraft Systems": "https://www.aopa.org/news-and-media/all-news/2020/january/flight-training-magazine/aircraft-systems",
  "Decision Making": "https://www.coursera.org/learn/decision-making",
  "Multilingual Fluency": "https://www.duolingo.com/",
  "Cultural Context Understanding": "https://www.futurelearn.com/courses/culture-language",
  "Grammar": "https://www.grammarly.com/blog/",
  "Proofreading": "https://owl.purdue.edu/owl/general_writing/the_writing_process/proofreading.html",
  "Circuit Design": "https://www.tinkercad.com/circuits",
  "Safety Protocols": "https://www.osha.gov/safety-management",
  "Troubleshooting": "https://www.udemy.com/course/electrical-troubleshooting/",
  "Wiring": "https://www.familyhandyman.com/project/home-electrical-wiring-guide/"
}


st.sidebar.title("📘 Navigation")
page = st.sidebar.radio("Go to", ["🔍 Skill Gap Analyzer", "ℹ️ About"])


if page.startswith("🔍"):
    st.title("📊 Skill Gap Analyzer")
    st.markdown("Unlock your career potential by discovering the exact skills you need to reach your dream job.")

    left, right = st.columns(2)
    user_skills = {}

    with left:
        st.subheader("📄 Upload Resume")
        resume_file = st.file_uploader("Upload a PDF resume", type=["pdf"])
        if resume_file:
            pdf_reader = PyPDF2.PdfReader(resume_file)
            resume_text = "".join(page.extract_text() for page in pdf_reader.pages).lower()

            known_skills = {
                skill.strip().lower(): skill.strip().title()
                for role in job_roles_data.values()
                for skill in role
            }

            found_skills = [known_skills[skill] for skill in known_skills if re.search(rf'\b{re.escape(skill)}\b', resume_text)]
            for skill in found_skills:
                user_skills[skill] = 7

            st.success(f"✅ {len(user_skills)} skills extracted from resume.")
            if found_skills:
                st.markdown("### 📄 Extracted Skills from Resume:")
                st.markdown(", ".join(sorted(found_skills)))
            else:
                st.warning("⚠️ No relevant skills found in the uploaded resume.")

    with right:
        st.subheader("✍️ Or Enter Skills Manually")
        if not user_skills:
            skill_count = st.slider("Number of skills to input", 1, 10, 4)
            for i in range(skill_count):
                skill = st.text_input(f"Skill {i+1}", key=f"skill_{i}")
                prof = st.slider(f"Proficiency for {skill}", 0, 10, 5, key=f"prof_{i}")
                if skill:
                    user_skills[skill.strip().title()] = prof

    
    st.subheader("💼 Choose Target Job Roles")
    selected_roles = st.multiselect("Select one or more roles:", list(job_roles_data.keys()))

    if selected_roles and user_skills:
        combined_skills = set()
        role_skill_map = {}
        for role in selected_roles:
            role_skills = job_roles_data[role]
            combined_skills.update(role_skills)
            role_skill_map[role] = role_skills

        all_skills = sorted(combined_skills)
        matched_skills = [s for s in all_skills if s in user_skills]
        missing_skills = [s for s in all_skills if s not in user_skills]
        skill_values = [user_skills.get(skill, 0) for skill in all_skills]
        colors = ['green' if skill in user_skills else 'red' for skill in all_skills]

        
        st.subheader("📊 Skill Gap Chart")
        fig = go.Figure(data=[
            go.Bar(
                x=all_skills,
                y=skill_values,
                marker_color=colors,
                text=[f"{val}/10" if skill in user_skills else "❌ Missing"
                      for skill, val in zip(all_skills, skill_values)],
                textposition="outside",
                textfont=dict(color='black')  # This makes all text black/dark
            )
        ])
        fig.update_layout(
            yaxis=dict(title="Proficiency (0–10)"),
            xaxis_title="Skills",
            plot_bgcolor='white'
        )
        st.plotly_chart(fig, use_container_width=True)

        
        with st.expander("📉 Missing Skills & Learning Links", expanded=True):
            if missing_skills:
                for skill in missing_skills:
                    # Try exact match first, then case-insensitive match
                    link = resource_links.get(skill)
                    if not link:
                        # Try case-insensitive matching
                        for key, value in resource_links.items():
                            if key.lower() == skill.lower():
                                link = value
                                break
                    st.markdown(f"- **{skill}** — [Learn here]({link})" if link else f"- **{skill}** — No link available")
            else:
                st.success("🎉 You have all the required skills!")

        with st.expander("📋 Role-by-Role Skill Match Table"):
            table = []
            for role, skills in role_skill_map.items():
                required = set(skills)
                matched = required & user_skills.keys()
                missing = required - user_skills.keys()
                pct = round(len(matched) / len(required) * 100, 2) if required else 0
                table.append({
                    "Role": role,
                    "Matched Skills": ", ".join(sorted(matched)),
                    "Missing Skills": ", ".join(sorted(missing)),
                    "Match %": f"{pct}%"
                })
            st.dataframe(pd.DataFrame(table))

        with st.expander("🔮 Top 5 Skills to Learn Next"):
            flat_missing = [skill for role in selected_roles for skill in job_roles_data[role] if skill not in user_skills]
            recommended = [s for s, _ in Counter(flat_missing).most_common(5)]
            for skill in recommended:
                # Try exact match first, then case-insensitive match
                link = resource_links.get(skill)
                if not link:
                    # Try case-insensitive matching
                    for key, value in resource_links.items():
                        if key.lower() == skill.lower():
                            link = value
                            break
                st.markdown(f"- **{skill}** — [Resource]({link if link else '#'})")

        
        if st.button("📥 Download PDF Report"):
            pdf = FPDF()
            pdf.add_page()
            pdf.set_font("Arial", size=12)
            pdf.cell(200, 10, txt="Skill Gap Report", ln=True, align="C")
            pdf.cell(200, 10, txt=f"Roles: {', '.join(selected_roles)}", ln=True)
            pdf.ln(5)
            pdf.cell(200, 10, txt="Missing Skills:", ln=True)
            for skill in missing_skills:
                pdf.cell(200, 8, txt=f"- {skill}", ln=True)
            pdf.ln(5)
            pdf.cell(200, 10, txt="Top Recommendations:", ln=True)
            for skill in recommended:
                pdf.cell(200, 8, txt=f"- {skill}", ln=True)
            pdf_bytes = pdf.output(dest='S').encode('latin1')
            pdf_output = io.BytesIO(pdf_bytes)
            st.download_button(
                label="📄 Download PDF Report",
                data=pdf_output.getvalue(),
                file_name="skill_gap_report.pdf",
                mime="application/pdf"
            )


elif page.startswith("ℹ️"):
    st.title("About Skill Gap Analyzer")
    st.markdown("""
    Skill Gap Analyzer helps you evaluate your current skills against the expectations of real-world job roles.

    **Features:**
    - 📄 Upload your resume (PDF) to auto-extract skills
    - ✍️ Enter your skills manually with proficiency levels
    - 💼 Compare yourself with 35+ professional roles
    - 📊 Visualize your skill gaps
    - 🔗 Get free resources to learn what you're missing
    - 📥 Export a personalized PDF report

    Built using Python, Streamlit, Plotly, and your ambition toward skill building.
    """)
