// Single source of truth for campuses, colleges and departments (used by the server and sent to the browser).
module.exports = {
  campuses: ["Cagayan de Oro"], // add more campuses here later if needed
  colleges: [
    { code: "CITC", name: "College of Information Technology and Computing", departments: [
      "Department of Computer Science", "Department of Information Technology", "Department of Data Science",
      "Department of Technology Communication Management"] },
    { code: "CEA", name: "College of Engineering and Architecture", departments: [
      "Department of Civil Engineering", "Department of Electrical Engineering", "Department of Computer Engineering",
      "Department of Mechanical Engineering", "Department of Electronics Engineering", "Department of Geodetic Engineering",
      "Department of Environmental Engineering", "Department of Agricultural and Biosystems Engineering",
      "Department of Naval Architecture and Marine Engineering", "Department of Architecture"] },
    { code: "CSM", name: "College of Science and Mathematics", departments: [
      "Department of Environmental Science", "Department of Physics (Applied Physics)", "Department of Chemistry",
      "Department of Food Science and Technology", "Department of Mathematical Sciences (Applied Mathematics)",
      "Communication Arts, Language, and Literature Unit", "Social Sciences Unit", "Physical Education Unit",
      "National Service Training Program (NSTP) Unit"] },
    { code: "COT", name: "College of Technology", departments: [
      "Department of Energy Systems and Management", "Department of Electronics Technology",
      "Department of Manufacturing Engineering Technology", "Department of Autotronics Technology",
      "Department of Technology Operations and Management"] },
    { code: "CSTE", name: "College of Science and Technology Education", departments: [
      "Department of Secondary Education (Major in Mathematics / Science)", "Department of Technical-Teacher Education",
      "Department of Technology and Livelihood Education"] },
    { code: "College of Medicine", name: "College of Medicine", departments: ["Department of Medicine"] }
  ]
};
