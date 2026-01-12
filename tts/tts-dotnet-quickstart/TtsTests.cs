// To run tests, run:
// dotnet test tts-csharp-quickstart.tests.csproj

using System;
using System.Threading.Tasks;
using DotNetEnv;
using Hume;
using Xunit;

namespace TtsCsharpQuickstart.Tests;

public class TtsTestFixture : IAsyncLifetime
{
    public string ApiKey { get; private set; } = string.Empty;
    public HumeClient? HumeClient { get; private set; }

    public Task InitializeAsync()
    {
        // Tests run from bin/Debug/net9.0/, so .env is 3 levels up
        Env.Load("../../../.env");

        var apiKey = Environment.GetEnvironmentVariable("TEST_HUME_API_KEY")
            ?? Environment.GetEnvironmentVariable("HUME_API_KEY");

        if (string.IsNullOrEmpty(apiKey))
        {
            throw new InvalidOperationException(
                "API key is required. Set TEST_HUME_API_KEY (CI) or HUME_API_KEY.");
        }

        ApiKey = apiKey;
        HumeClient = new HumeClient(ApiKey);

        return Task.CompletedTask;
    }

    public Task DisposeAsync()
    {
        return Task.CompletedTask;
    }
}

[Collection("TtsTests")]
public class TtsJsonStreamTests : IClassFixture<TtsTestFixture>
{
    private readonly TtsTestFixture _fixture;

    public TtsJsonStreamTests(TtsTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public void TestFixture_HasApiKey()
    {
        Assert.False(string.IsNullOrEmpty(_fixture.ApiKey), "API key loaded");
        Assert.NotNull(_fixture.HumeClient);
    }

    // TODO: Implement test
}

[Collection("TtsTests")]
public class TtsStreamInputTests : IClassFixture<TtsTestFixture>
{
    private readonly TtsTestFixture _fixture;

    public TtsStreamInputTests(TtsTestFixture fixture)
    {
        _fixture = fixture;
    }

    // TODO: Implement test
}

[CollectionDefinition("TtsTests")]
public class TtsTestCollection : ICollectionFixture<TtsTestFixture>
{
}
