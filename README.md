## 📊 Skill Gap Analyzer

**Unlock your career potential by discovering the exact skills you need to reach your dream job.**


## 🚀 Live Demo

**Try it now:** [Skill Gap Analyzer](https://skill-gap-analyzer-zjh2jfrsljbgqzncuyysde.streamlit.app/)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## 🎯 Overview

Skill Gap Analyzer is a web application that helps professionals and job seekers identify skill gaps between their current expertise and their target job roles. By analyzing resumes and comparing them against industry-standard job requirements, users can get personalized learning recommendations to advance their careers.

### Problem Solved
- **Career Uncertainty**: Not knowing what skills to learn next
- **Job Market Mismatch**: Understanding why job applications get rejected
- **Learning Direction**: Getting personalized, actionable learning paths
- **Skill Assessment**: Objectively measuring your readiness for specific roles

## ✨ Features

### 🔍 **Smart Resume Analysis**
- Upload PDF resumes for automatic skill extraction
- Uses NLP techniques to identify relevant technical and soft skills
- Supports various resume formats and layouts

### 📊 **Interactive Skill Gap Visualization**
- Dynamic bar charts showing skill proficiency levels
- Color-coded visualization (green for possessed skills, red for missing)
- Real-time updates based on selected job roles

### 💼 **35+ Professional Job Roles**
Including but not limited to:
- Data Scientist
- Software Engineer
- Product Manager
- Digital Marketing Specialist
- UX/UI Designer
- Cybersecurity Analyst
- And many more...

### 🎓 **Personalized Learning Recommendations**
- Curated learning resources for each missing skill
- Direct links to high-quality courses and tutorials
- Prioritized recommendations based on skill importance

### 📈 **Comprehensive Analytics**
- Role-by-role skill match percentages
- Detailed skill gap analysis tables
- Top 5 priority skills to learn next

### 📄 **Professional Reports**
- Downloadable PDF skill gap reports
- Perfect for career planning and performance reviews
- Include all analysis results and recommendations

## 🛠 Tech Stack

**Frontend & Backend:**
- **Streamlit** - Web application framework
- **Python 3.8+** - Core programming language

**Data Processing:**
- **Pandas** - Data manipulation and analysis
- **PyPDF2** - PDF text extraction
- **JSON** - Job roles and skills data storage

**Visualization:**
- **Plotly** - Interactive charts and graphs
- **Custom CSS** - Enhanced UI styling

**PDF Generation:**
- **FPDF** - PDF report creation

**Deployment:**
- **Streamlit Cloud** - Cloud hosting platform
- **GitHub** - Version control and CI/CD

## 🚀 Installation

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/raja-678/skill-gap-analyzer.git
   cd skill-gap-analyzer
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   streamlit run app.py
   ```

4. **Open your browser**
   Navigate to `http://localhost:8501`

### Dependencies

```txt
streamlit>=1.28.0
pandas>=1.5.0
plotly>=5.15.0
PyPDF2>=3.0.0
fpdf>=2.5.0
```

## 💡 Usage

### Quick Start Guide

1. **Visit the App**: Go to the [live demo](https://skill-gap-analyzer-zjh2jfrsljbgqzncuyysde.streamlit.app/)

2. **Input Your Skills**:
   - **Option A**: Upload your PDF resume for automatic skill extraction
   - **Option B**: Manually enter your skills with proficiency levels (0-10)

3. **Select Target Roles**: Choose one or more job roles you're interested in

4. **Analyze Results**:
   - View your skill gap visualization
   - Explore missing skills with learning resources
   - Check role-by-role match percentages

5. **Take Action**:
   - Download your personalized PDF report
   - Start learning with recommended resources
   - Track your progress over time

### Sample Use Cases

**🎓 Recent Graduate**
- Upload resume to see extracted skills
- Compare against entry-level positions
- Get learning roadmap for first job

**💼 Career Changer**
- Analyze skills for target industry
- Identify transferable skills
- Plan transition strategy

**📈 Professional Growth**
- Compare current role vs. promotion requirements
- Identify skill gaps for advancement
- Create development plan




## 🔮 Future Enhancements

- [ ] **User Authentication**: Save analysis history and progress tracking
- [ ] **More Job Roles**: Expand to 100+ professional roles
- [ ] **Skill Trends**: Integration with job market data APIs
- [ ] **Mobile App**: Native iOS and Android versions
- [ ] **AI Recommendations**: Machine learning-powered skill suggestions
- [ ] **Team Analytics**: Compare skills across team members
- [ ] **Certification Tracking**: Integration with online learning platforms

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Areas for Contribution
- Adding more job roles and skills
- Improving PDF text extraction accuracy
- Enhancing UI/UX design
- Adding new visualization features
- Writing tests and documentation
