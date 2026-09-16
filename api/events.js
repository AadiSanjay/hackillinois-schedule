export default async function handler(request, response) {
  try {
    const apiResponse = await fetch(
      "https://adonix.hackillinois.org/event/"
    );

    if (!apiResponse.ok) {
      return response.status(apiResponse.status).json({
        error: "Failed to fetch HackIllinois events",
      });
    }

    const data = await apiResponse.json();

    response.setHeader(
      "Cache-Control",
      "s-maxage=300, stale-while-revalidate=600"
    );

    return response.status(200).json(data);
  } catch (error) {
    console.error(error);

    return response.status(500).json({
      error: "Unable to load HackIllinois events",
    });
  }
}