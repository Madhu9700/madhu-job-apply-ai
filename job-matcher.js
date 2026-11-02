const preferences = {
  experienceYears: 4.7,
  locations: ["Chennai", "Bengaluru", "Hyderabad"],
  minimumMatchScore: 60,

  searchRoles: [
    "Manual Tester 4 to 5 years",
    "QA Engineer 4 to 5 years",
    "Functional Testing Engineer",
    "Playwright QA Engineer"
  ],

  targetRoles: [
    "manual tester",
    "manual testing",
    "qa engineer",
    "software test engineer",
    "functional testing",
    "regression testing",
    "playwright automation",
    "qa automation",
    "automation test engineer",
    "quality assurance",
    "test engineer",
    "quality analyst"
  ],

  primarySkills: [
    "manual testing",
    "functional testing",
    "regression testing",
    "smoke testing",
    "playwright",
    "javascript",
    "typescript",
    "test case",
    "test scenarios",
    "bug tracking",
    "defect management",
    "api testing"
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
  if (Array.isArray(result.results)) return result.results;

  return [];
}

function getJobLocation(job) {
  return normalize(
    job.job_location ||
    [
      job.job_city,
      job.job_state,
      job.job_country
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function getJobText(job) {
  return normalize(
    `${job.job_title || ""} ${job.job_description || ""}`
  );
}

function isRelevantRole(title) {
  const normalizedTitle = normalize(title);

  const excludedRoles = [
    "senior manager",
    "test manager",
    "qa manager",
    "engineering manager",
    "director",
    "intern",
    "trainee"
  ];

  if (excludedRoles.some(role => normalizedTitle.includes(role))) {
    return false;
  }

  return preferences.targetRoles.some(role =>
    normalizedTitle.includes(normalize(role))
  );
}

function extractExperienceRange(text) {
  const normalizedText = normalize(text);

  // Example: 4-6 years or 4 to 6 years
  const rangeMatch = normalizedText.match(
    /(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/
  );

  if (rangeMatch) {
    return {
      min: Number(rangeMatch[1]),
      max: Number(rangeMatch[2])
    };
  }

  // Example: 5+ years
  const plusMatch = normalizedText.match(
    /(\d+(?:\.\d+)?)\s*\+\s*(?:years?|yrs?)/
  );

  if (plusMatch) {
    return {
      min: Number(plusMatch[1]),
      max: Infinity
    };
  }

  // Example: minimum 4 years
  const minimumMatch = normalizedText.match(
    /(?:minimum|min)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/
  );

  if (minimumMatch) {
    return {
      min: Number(minimumMatch[1]),
      max: Infinity
    };
  }

  // Example: 4 years experience
  const singleMatch = normalizedText.match(
    /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/
  );

  if (singleMatch) {
    const years = Number(singleMatch[1]);

    return {
      min: years,
      max: years
    };
  }

  return null;
}

function calculateJobMatch(job, cityPriority) {
  const title = normalize(job.job_title);
  const description = normalize(job.job_description);
  const location = getJobLocation(job);
  const fullText = `${title} ${description}`;

  const roleMatch = isRelevantRole(title);
  const roleScore = roleMatch ? 30 : 0;

  const matchedSkills = preferences.primarySkills.filter(skill =>
    fullText.includes(normalize(skill))
  );

  const skillScore = Math.round(
    (matchedSkills.length / preferences.primarySkills.length) * 35
  );

  const experienceRange = extractExperienceRange(fullText);

  let experienceMatch = true;
  let experienceScore = 20;
  let experienceReason = "Experience requirement not specified";

  if (experienceRange) {
    experienceMatch =
      preferences.experienceYears >= experienceRange.min &&
      preferences.experienceYears <= experienceRange.max;

    experienceScore = experienceMatch ? 20 : 0;

    experienceReason = experienceMatch
      ? `Experience matched: ${experienceRange.min}-${experienceRange.max} years`
      : `Experience mismatch: required ${experienceRange.min}-${experienceRange.max} years`;
  }

  const locationMatch = preferences.locations.some(city =>
    location.includes(normalize(city))
  );

  const locationScore = locationMatch ? 15 : 0;

  const totalScore = Math.min(
    100,
    Math.round(roleScore + skillScore + experienceScore + locationScore)
  );

  const reasons = [];

  if (!roleMatch) {
    reasons.push("Role does not match target roles");
  }

  if (!locationMatch) {
    reasons.push(`Location not matched: ${location || "Unknown"}`);
  }

  if (!experienceMatch) {
    reasons.push(experienceReason);
  }

  if (totalScore < preferences.minimumMatchScore) {
    reasons.push(
      `Score below threshold: ${totalScore}/${preferences.minimumMatchScore}`
    );
  }

  if (reasons.length === 0) {
    reasons.push("Meets current matching criteria");
  }

  return {
    title: job.job_title || "Not available",
    company: job.employer_name || "Not available",
    location: job.job_location || job.job_city || "Not available",
    matchScore: totalScore,
    matchedSkills,
    applyLink: job.job_apply_link || job.job_google_link || "",
    cityPriority,
    roleMatch,
    locationMatch,
    experienceMatch,
    qualifies:
      totalScore >= preferences.minimumMatchScore &&
      roleMatch &&
      locationMatch &&
      experienceMatch,
    reasons
  };
}

async function fetchJobs(city, searchRole) {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY GitHub Secret is missing.");
  }

  const query = encodeURIComponent(`${searchRole} jobs in ${city}`);

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
      console.log(
        `${city} | ${searchRole} | attempt ${attempt}: ${error.message}`
      );

      if (attempt === 3) {
        console.log(`Skipping search: ${searchRole} in ${city}`);
        return [];
      }

      await new Promise(resolve =>
        setTimeout(resolve, attempt * 5000)
      );
    }
  }

  return [];
}

async function main() {
  console.log("Starting Job Matcher...\n");
  console.log(`Minimum match score: ${preferences.minimumMatchScore}%`);

  const allJobs = [];

  // Chennai first, Bengaluru second, Hyderabad third
  for (let cityIndex = 0; cityIndex < preferences.locations.length; cityIndex++) {
    const city = preferences.locations[cityIndex];

    console.log(`\n========== ${city.toUpperCase()} ==========`);

    for (const searchRole of preferences.searchRoles) {
      console.log(`Searching: ${searchRole} in ${city}`);

      const jobs = await fetchJobs(city, searchRole);

      console.log(`Fetched ${jobs.length} jobs`);

      for (const job of jobs) {
        allJobs.push({
          ...job,
          searchCity: city,
          cityPriority: cityIndex
        });
      }
    }
  }

  // Deduplicate using job ID, apply URL, or title/company/location
  const uniqueJobs = [
    ...new Map(
      allJobs.map(job => {
        const key = normalize(
          job.job_id ||
          job.job_apply_link ||
          `${job.job_title}-${job.employer_name}-${job.job_location}`
        );

        return [key, job];
      })
    ).values()
  ];

  const scoredJobs = uniqueJobs.map(job =>
    calculateJobMatch(job, job.cityPriority)
  );

  console.log("\n========== JOB MATCH ANALYSIS ==========");

  scoredJobs.forEach((job, index) => {
    console.log(`\n--- Job ${index + 1} ---`);
    console.log(`Title: ${job.title}`);
    console.log(`Company: ${job.company}`);
    console.log(`Location: ${job.location}`);
    console.log(`Match Score: ${job.matchScore}%`);
    console.log(`Matched Skills: ${job.matchedSkills.join(", ") || "None"}`);
    console.log(`Status: ${job.qualifies ? "MATCHED" : "NOT MATCHED"}`);
    console.log(`Reason: ${job.reasons.join(" | ")}`);
    console.log(`Apply Link: ${job.applyLink}`);
  });

  const matchedJobs = scoredJobs
    .filter(job => job.qualifies)
    .sort((a, b) => {
      if (a.cityPriority !== b.cityPriority) {
        return a.cityPriority - b.cityPriority;
      }

      return b.matchScore - a.matchScore;
    });

  console.log("\n========================================");
  console.log(`Total jobs fetched: ${uniqueJobs.length}`);
  console.log(`Matching jobs (60%+): ${matchedJobs.length}`);
  console.log("========================================\n");

  if (matchedJobs.length === 0) {
    console.log(
      "No jobs met the current matching criteria. Review the analysis above."
    );
    return;
  }

  console.log("========== MATCHED JOBS ==========\n");

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
