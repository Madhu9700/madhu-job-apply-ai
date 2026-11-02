const preferences = {
  experienceYears: 4.7,
  locations: ["Chennai", "Bengaluru", "Hyderabad"],
  minimumMatchScore: 75,

  targetRoles: [
    "manual tester",
    "manual testing",
    "qa engineer",
    "software test engineer",
    "functional testing",
    "regression testing",
    "playwright automation",
    "qa automation",
    "automation test engineer"
  ],

  primarySkills: [
    "manual testing",
    "functional testing",
    "regression testing",
    "smoke testing",
    "playwright",
    "javascript",
    "typescript"
  ]
};

function normalize(value = "") {
  return String(value).toLowerCase().trim();
}

function extractJobs(result) {
  if (Array.isArray(result.data)) return result.data;
  if (Array.isArray(result.data?.jobs)) return result.data.jobs;
  if (Array.isArray(result.jobs)) return result.jobs;
  if (Array.isArray(result.job_results)) return result.job_results;
  return [];
}

async function fetchJobs(city) {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY GitHub Secret is missing.");
  }

  const query = encodeURIComponent(
    `Manual Testing QA Playwright jobs in ${city}`
  );

  const url =
    `https://jsearch.p.rapidapi.com/search-v2?query=${query}` +
    `&page=1&num_pages=1&country=in&language=en&date_posted=3days`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(30000),
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "jsearch.p.rapidapi.com"
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          `RapidAPI ${response.status}: ${JSON.stringify(result)}`
        );
      }

      return extractJobs(result);
    } catch (error) {
      console.log(`${city} attempt ${attempt}: ${error.message}`);

      if (attempt === 3) {
        console.log(`Skipping ${city} after retries.`);
        return [];
      }

      await new Promise(resolve =>
        setTimeout(resolve, attempt * 5000)
      );
    }
  }

  return [];
}

function calculateJobMatch(job, cityPriority) {
  const title = normalize(job.job_title);
  const description = normalize(job.job_description);
  const location = normalize(
    job.job_location ||
    [job.job_city, job.job_state, job.job_country]
      .filter(Boolean)
      .join(" ")
  );

  const text = `${title} ${description}`;

  const roleMatch = preferences.targetRoles.some(role =>
    title.includes(role)
  );

  const roleScore = roleMatch ? 20 : 0;

  const matchedSkills = preferences.primarySkills.filter(skill =>
    text.includes(skill)
  );

  const skillScore =
    (matchedSkills.length / preferences.primarySkills.length) * 40;

  const expText = `${title} ${description}`;

  const expMatch = expText.match(
    /(\d+(?:\.\d+)?)\s*(?:\+|to|-)?\s*(\d+(?:\.\d+)?)?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)?/i
  );

  let experienceMatch = true;

  if (expMatch) {
    const minExp = Number(expMatch[1]);
    const maxExp = expMatch[2] ? Number(expMatch[2]) : minExp;

    experienceMatch =
      preferences.experienceYears >= minExp &&
      preferences.experienceYears <= maxExp;
  }

  const experienceScore = experienceMatch ? 25 : 0;

  const locationMatch = preferences.locations.some(city =>
    location.includes(normalize(city))
  );

  const locationScore = locationMatch ? 15 : 0;

  const totalScore = Math.round(
    roleScore + skillScore + experienceScore + locationScore
  );

  return {
    title: job.job_title || "Not available",
    company: job.employer_name || "Not available",
    location: job.job_location || job.job_city || "Not available",
    matchScore: totalScore,
    matchedSkills,
    applyLink: job.job_apply_link || job.job_google_link || "",
    cityPriority,
    qualifies:
      totalScore >= preferences.minimumMatchScore &&
      roleMatch &&
      locationMatch &&
      experienceMatch
  };
}

async function main() {
  console.log("Starting Job Matcher...\n");

  const allJobs = [];

  for (let i = 0; i < preferences.locations.length; i++) {
    const city = preferences.locations[i];

    console.log(`Fetching jobs for ${city}...`);

    const jobs = await fetchJobs(city);

    console.log(`Fetched ${jobs.length} jobs from ${city}`);

    for (const job of jobs) {
      allJobs.push({
        ...job,
        searchCity: city,
        cityPriority: i
      });
    }
  }

  const uniqueJobs = [
    ...new Map(
      allJobs.map(job => [
        `${normalize(job.job_title)}-${normalize(job.employer_name)}-${normalize(job.job_location)}`,
        job
      ])
    ).values()
  ];

  const matchedJobs = uniqueJobs
    .map(job => calculateJobMatch(job, job.cityPriority))
    .filter(job => job.qualifies)
    .sort((a, b) => {
      if (a.cityPriority !== b.cityPriority) {
        return a.cityPriority - b.cityPriority;
      }

      return b.matchScore - a.matchScore;
    });

  console.log("\n==============================");
  console.log(`Total jobs fetched: ${uniqueJobs.length}`);
  console.log(`Matching jobs: ${matchedJobs.length}`);
  console.log("==============================\n");

  if (matchedJobs.length === 0) {
    console.log("No jobs met the current matching criteria.");
    return;
  }

  matchedJobs.forEach((job, index) => {
    console.log(`--- Match ${index + 1} ---`);
    console.log(`Title: ${job.title}`);
    console.log(`Company: ${job.company}`);
    console.log(`Location: ${job.location}`);
    console.log(`Match Score: ${job.matchScore}%`);
    console.log(`Matched Skills: ${job.matchedSkills.join(", ")}`);
    console.log(`Apply Link: ${job.applyLink}`);
    console.log("");
  });
}

main().catch(error => {
  console.error("Job Agent failed:", error.message);
  process.exit(1);
});
