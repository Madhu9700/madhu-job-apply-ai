
const preferences = {
  experienceYears: 4.7,

  locations: ["Chennai", "Bengaluru", "Hyderabad"],

  targetRoles: [
    "Manual Testing Engineer",
    "Manual Tester",
    "QA Engineer",
    "Software Test Engineer",
    "Functional Testing Engineer",
    "Regression Testing Engineer",
    "Playwright Automation Engineer",
    "QA Automation Engineer",
    "Automation Test Engineer"
  ],

  primarySkills: [
    "Manual Testing",
    "Functional Testing",
    "Regression Testing",
    "Smoke Testing",
    "Playwright",
    "JavaScript",
    "TypeScript"
  ],

  excludedSkills: ["Selenium"],

  minimumMatchScore: 75
};

function normalize(text = "") {
  return text.toLowerCase().trim();
}

function calculateJobMatch(job) {
  const title = normalize(job.title);
  const description = normalize(job.description);
  const location = normalize(job.location);

  const combinedText = `${title} ${description}`;

  // Role match — 20 points
  const roleMatch = preferences.targetRoles.some(role =>
    title.includes(normalize(role))
  );

  const roleScore = roleMatch ? 20 : 0;

  // Skills match — 40 points
  const matchedSkills = preferences.primarySkills.filter(skill =>
    combinedText.includes(normalize(skill))
  );

  const skillScore =
    (matchedSkills.length / preferences.primarySkills.length) * 40;

  // Experience match — 25 points
  const minExp = Number(job.minExperience ?? 0);
  const maxExp = Number(job.maxExperience ?? 100);

  const experienceMatch =
    preferences.experienceYears >= minExp &&
    preferences.experienceYears <= maxExp;

  const experienceScore = experienceMatch ? 25 : 0;

  // Location match — 15 points
  const locationMatch = preferences.locations.some(city =>
    location.includes(normalize(city))
  );

  const locationScore = locationMatch ? 15 : 0;

  // Skip only when Selenium is explicitly mandatory
  const requiredSkills = (job.requiredSkills ?? [])
    .map(normalize);

  const excludedSkillRequired =
    requiredSkills.includes("selenium");

  const totalScore = Math.round(
    roleScore + skillScore + experienceScore + locationScore
  );

  return {
    title: job.title,
    location: job.location,
    matchScore: totalScore,
    matchedSkills,
    experienceMatch,
    locationMatch,
    excludedSkillRequired,

    qualifies:
      totalScore >= preferences.minimumMatchScore &&
      !excludedSkillRequired
  };
}

module.exports = {
  preferences,
  calculateJobMatch
};
