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

  minimumMatchScore: 75
};

function normalize(text = "") {
  return String(text).toLowerCase().trim();
}

function calculateJobMatch(job) {
  const title = normalize(job.title);
  const description = normalize(job.description);
  const location = normalize(job.location);
  const combinedText = `${title} ${description}`;

  const roleMatch = preferences.targetRoles.some(role =>
    title.includes(normalize(role))
  );

  const roleScore = roleMatch ? 20 : 0;

  const matchedSkills = preferences.primarySkills.filter(skill =>
    combinedText.includes(normalize(skill))
  );

  const skillScore =
    (matchedSkills.length / preferences.primarySkills.length) * 40;

  const minExp = Number(job.minExperience ?? 0);
  const maxExp = Number(job.maxExperience ?? 100);

  const experienceMatch =
    preferences.experienceYears >= minExp &&
    preferences.experienceYears <= maxExp;

  const experienceScore = experienceMatch ? 25 : 0;

  const locationIndex = preferences.locations.findIndex(city =>
    location.includes(normalize(city))
  );

  const locationMatch = locationIndex !== -1;
  const locationScore = locationMatch ? 15 : 0;

  const seleniumMandatory =
    /\b(selenium)\b.{0,40}\b(mandatory|required|must have)\b|\b(mandatory|required|must have)\b.{0,40}\b(selenium)\b/i
      .test(description);

  const totalScore = Math.round(
    roleScore + skillScore + experienceScore + locationScore
  );

  return {
    title: job.title,
    company: job.company,
    location: job.location,
    matchScore: totalScore,
    matchedSkills,
    experienceMatch,
    locationIndex,
    seleniumMandatory,
    applyLink: job.applyLink,

    qualifies:
      totalScore >= preferences.minimumMatchScore &&
      locationMatch &&
      !seleniumMandatory
  };
}

function mapApiJob(job) {
  const experience = job.job_required_experience || {};

  return {
    title: job.job_title || "",
    company: job.employer_name || "",
    location: [
      job.job_city,
      job.job_state,
      job.job_country
    ].filter(Boolean).join(", "),

    description: job.job_description || "",

    minExperience:
      experience.required_experience_in_months != null
        ? Number(experience.required_experience_in_months) / 12
        : 0,

    maxExperience: 100,

    applyLink: job.job_apply_link || job.job_google_link || ""
  };
}

async function fetchJobs(city) {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY GitHub Secret is missing.");
  }

  const query = encodeURIComponent(`Manual Testing jobs in ${city}`);

  const url =
    `https://jsearch.p.rapidapi.com/search-v2?query=${query}` +
    `&page=1&num_pages=1&country=in&language=en&date_posted=3days`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "jsearch.p.rapidapi.com"
    }
  });

  if (!response.ok) {
    throw new Error(`API error for ${city}: ${response.status}`);
  }

  const result = await response.json();
  return result.data || [];
}

async function main() {
  console.log("Starting Manual Testing Job Matcher...\n");

  const allJobs = [];

  for (const city of preferences.locations) {
    console.log(`Fetching jobs for ${city}...`);

    const apiJobs = await fetchJobs(city);
    const mappedJobs = apiJobs.map(mapApiJob);

    allJobs.push(...mappedJobs);
  }

  const uniqueJobs = [
    ...new Map(
      allJobs.map(job => [
        `${job.title}-${job.company}-${job.location}`,
        job
      ])
    ).values()
  ];

  const matchedJobs = uniqueJobs
    .map(calculateJobMatch)
    .filter(job => job.qualifies)
    .sort((a, b) => {
      if (a.locationIndex !== b.locationIndex) {
        return a.locationIndex - b.locationIndex;
      }

      return b.matchScore - a.matchScore;
    });

  console.log(`\nTotal jobs fetched: ${uniqueJobs.length}`);
  console.log(`Matching jobs: ${matchedJobs.length}\n`);

  if (matchedJobs.length === 0) {
    console.log("No jobs met the current matching criteria.");
    return;
  }

  matchedJobs.forEach((job, index) => {
    console.log(`--- Job ${index + 1} ---`);
    console.log(`Title: ${job.title}`);
    console.log(`Company: ${job.company}`);
    console.log(`Location: ${job.location}`);
    console.log(`Match Score: ${job.matchScore}%`);
    console.log(`Skills: ${job.matchedSkills.join(", ")}`);
    console.log(`Apply Link: ${job.applyLink}`);
    console.log("");
  });
}

main().catch(error => {
  console.error("Job Agent failed:", error.message);
  process.exit(1);
});
