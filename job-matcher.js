
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

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `RapidAPI error ${response.status}: ${JSON.stringify(result)}`
    );
  }

  if (Array.isArray(result.data)) {
    return result.data;
  }

  console.log(
    `Unexpected API response for ${city}:`,
    JSON.stringify(result).slice(0, 1000)
  );

  return [];
}
