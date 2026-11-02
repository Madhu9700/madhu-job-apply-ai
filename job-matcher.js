async function fetchJobs(city) {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY GitHub Secret is missing.");
  }

  const query = encodeURIComponent(
    `Manual Testing jobs in ${city}`
  );

  const url =
    `https://jsearch.p.rapidapi.com/search-v2?query=${query}` +
    `&num_pages=1&country=in&language=en&date_posted=3days`;

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

  if (Array.isArray(result.data)) {
    return result.data;
  }

  console.log("Unexpected API response:", JSON.stringify(result));
  return [];
}

async function main() {
  const cities = ["Chennai", "Bengaluru", "Hyderabad"];

  for (const city of cities) {
    console.log(`\nFetching jobs for ${city}...`);

    const jobs = await fetchJobs(city);

    console.log(`Fetched ${jobs.length} jobs from ${city}`);

    for (const job of jobs) {
      console.log("------------------------------");
      console.log("Job Title:", job.job_title || "Not available");
      console.log("Company:", job.employer_name || "Not available");
      console.log("Location:", job.job_city || city);
      console.log("Apply Link:", job.job_apply_link || "Not available");
    }
  }
}

main().catch(error => {
  console.error("Job Agent failed:", error.message);
  process.exit(1);
});
