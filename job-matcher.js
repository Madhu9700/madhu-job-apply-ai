async function fetchJobs(city) {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY GitHub Secret is missing.");
  }

  const query = encodeURIComponent(`Manual Testing jobs in ${city}`);
  const url =
    `https://jsearch.p.rapidapi.com/search-v2?query=${query}` +
    `&num_pages=1&country=in&language=en&date_posted=3days`;

  // Retry up to 3 times if the API is slow or temporarily unavailable
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`API request attempt ${attempt} for ${city}`);

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
          `RapidAPI error ${response.status}: ${JSON.stringify(result)}`
        );
      }

      // JSearch may return jobs inside data.jobs
      if (Array.isArray(result.data?.jobs)) {
        return result.data.jobs;
      }

      // Handle alternate response structures too
      if (Array.isArray(result.data)) {
        return result.data;
      }

      if (Array.isArray(result.jobs)) {
        return result.jobs;
      }

      console.log(`No job array found in API response for ${city}.`);
      return [];
    } catch (error) {
      console.log(`Attempt ${attempt} failed: ${error.message}`);

      if (attempt === 3) {
        console.log(`Skipping ${city} after 3 failed attempts.`);
        return [];
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, attempt * 5000));
    }
  }

  return [];
}

async function main() {
  const cities = ["Chennai", "Bengaluru", "Hyderabad"];
  let totalJobs = 0;

  for (const city of cities) {
    console.log(`\n========== ${city} ==========`);

    const jobs = await fetchJobs(city);

    console.log(`Fetched ${jobs.length} jobs from ${city}`);
    totalJobs += jobs.length;

    for (const job of jobs) {
      console.log("------------------------------");
      console.log("Job Title:", job.job_title || "Not available");
      console.log("Company:", job.employer_name || "Not available");
      console.log("Location:", job.job_location || job.job_city || city);
      console.log("Posted:", job.job_posted_at || "Not available");
      console.log("Apply Link:", job.job_apply_link || "Not available");
    }
  }

  console.log("\n================================");
  console.log(`Total jobs fetched: ${totalJobs}`);
  console.log("Job Agent completed.");
}

main().catch(error => {
  console.error("Job Agent failed:", error.message);
  process.exit(1);
});
