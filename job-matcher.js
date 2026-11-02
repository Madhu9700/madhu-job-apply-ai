
async function fetchJobs(city) {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY GitHub Secret is missing.");
  }

  const query = encodeURIComponent(`Manual Testing jobs in ${city}`);

  const url =
    `https://jsearch.p.rapidapi.com/search-v2?query=${query}` +
    `&page=1&num_pages=1&country=India&language=en&date_posted=3days`;

  const response = await fetch(url, {
    method: "GET",
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

  let jobs = [];

  if (Array.isArray(result.data)) {
    jobs = result.data;
  } else if (Array.isArray(result.data?.jobs)) {
    jobs = result.data.jobs;
  } else if (Array.isArray(result.jobs)) {
    jobs = result.jobs;
  }

  if (jobs.length === 0) {
    console.log(
      `No jobs array found for ${city}. API response:`,
      JSON.stringify(result).slice(0, 1500)
    );
  }

  return jobs;
}

async function main() {
  const cities = ["Chennai", "Bengaluru", "Hyderabad"];
  let totalJobs = 0;

  for (const city of cities) {
    console.log(`\nFetching jobs for ${city}...`);

    const jobs = await fetchJobs(city);

    console.log(`Fetched ${jobs.length} jobs from ${city}`);
    totalJobs += jobs.length;

    for (const job of jobs) {
      console.log("------------------------------");
      console.log("Job Title:", job.job_title || "Not available");
      console.log("Company:", job.employer_name || "Not available");

      const location = [
        job.job_city,
        job.job_state,
        job.job_country
      ].filter(Boolean).join(", ");

      console.log("Location:", location || city);
      console.log(
        "Apply Link:",
        job.job_apply_link || job.job_google_link || "Not available"
      );
    }
  }

  console.log("\n==============================");
  console.log(`Total jobs fetched: ${totalJobs}`);
  console.log("==============================");
}

main().catch(error => {
  console.error("Job Agent failed:", error.message);
  process.exit(1);
});
