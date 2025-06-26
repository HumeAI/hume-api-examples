import Foundation

/// Represents the JSON response at GET /access-token:
/// {
///   "access_token": "…"
/// }
public struct AccessTokenResponse: Decodable {
    /// The actual token string
    public let accessToken: String

    private enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
    }
}

/// A lightweight HTTP client for fetching an access token. 
public final class AccessTokenClient {
    private let host: String
    private let port: Int
    private let session: URLSession

    /// Initializes a new `AccessTokenClient`, defaults to `localhost:8000` which will work if you build in the simulator. If planning to build onto device on your local network, specifify the IP address of the machine running the server. In production environments, configure host and port as needed.
    /// - Parameters:
    ///   - host: server hostname (default: localhost)
    ///   - port: server port (default: 8000)
    ///   - session: URLSession to use (default: `.shared`)
    public init(
        host: String = "localhost",
        port: Int = 8000,
        session: URLSession = .shared
    ) {
        self.host = host
        self.port = port
        self.session = session
    }

    /// Fetches an access token from `/access-token`.
    ///
    /// - Returns: An `AccessTokenResponse` containing `accessToken`.
    /// - Throws: `URLError` if URL creation or network request fails,
    ///           or decoding errors if the JSON is malformed.
    public func fetchAccessToken() async throws -> AccessTokenResponse {
        var components = URLComponents()
        components.scheme = "http"
        components.host = host
        components.port = port
        components.path = "/access-token"

        guard let url = components.url else {
            throw URLError(.badURL)
        }

        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse,
              200..<300 ~= http.statusCode else {
            throw URLError(.badServerResponse)
        }

        let decoder = JSONDecoder()
        return try decoder.decode(AccessTokenResponse.self, from: data)
    }
}
