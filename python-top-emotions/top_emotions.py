import asyncio
import os
from datetime import datetime
from dotenv import load_dotenv
from typing import List
from hume import AsyncHumeClient
from hume.expression_measurement.batch import Face, Models
from hume.expression_measurement.batch.types import UnionPredictResult

async def main():
    # Load environment variables and obtain the Hume API key
    load_dotenv()
    HUME_API_KEY = os.getenv("HUME_API_KEY")

    # Initialize an authenticated client
    client = AsyncHumeClient(api_key=HUME_API_KEY)

    # Define the URL(s) of the files you would like to analyze
    job_urls = ["https://hume-tutorials.s3.amazonaws.com/faces.zip"]

    # Create configurations for each model you would like to use (blank = default)
    face_config = Face()

    # Create a Models object
    models_chosen = Models(face=face_config)

    # Start an inference job and print the job_id
    job_id = await client.expression_measurement.batch.start_inference_job(
        urls=job_urls, models=models_chosen
    )
    print(f"Job ID: {job_id}")

    # Await the completion of the inference job with timeout and exponential backoff
    await poll_for_completion(client, job_id, timeout=120)

    # After the job is over, access its predictions
    job_predictions = await client.expression_measurement.batch.get_job_predictions(
        id=job_id
    )
    
    # Print the raw prediction output
    # print(job_predictions)

    # Define parameters for processing predictions
    start_time = 0          # Start time in seconds, relative to when the inference was made
    end_time = 12           # End time in seconds, relative to when the inference was made
    n_top_values = 5        # Number of top emotions to display
    peak_threshold = 0.7    # Threshold for peaked emotions

    # Process and display the predictions
    process_predictions(
        job_predictions, start_time, end_time, n_top_values, peak_threshold
    )

async def poll_for_completion(client: AsyncHumeClient, job_id, timeout=120):
    """
    Polls for the completion of a job with a specified timeout (in seconds).

    Uses asyncio.wait_for to enforce a maximum waiting time.
    """
    try:
        # Wait for the job to complete or until the timeout is reached
        await asyncio.wait_for(poll_until_complete(client, job_id), timeout=timeout)
    except asyncio.TimeoutError:
        # Notify if the polling operation has timed out
        print(f"Polling timed out after {timeout} seconds.")

async def poll_until_complete(client: AsyncHumeClient, job_id):
    """
    Continuously polls the job status until it is completed, failed, or an unexpected status is encountered.

    Implements exponential backoff to reduce the frequency of requests over time.
    """
    last_status = None
    delay = 1  # Start with a 1-second delay

    while True:
        # Wait for the specified delay before making the next status check
        await asyncio.sleep(delay)

        # Retrieve the current job details
        job_details = await client.expression_measurement.batch.get_job_details(job_id)
        status = job_details.state.status

        # If the status has changed since the last check, print the new status
        if status != last_status:
            print(f"Status changed: {status}")
            last_status = status

        if status == "COMPLETED":
            # Job has completed successfully
            print("\nJob completed successfully:")
            # Convert timestamps from milliseconds to datetime objects
            created_time = datetime.fromtimestamp(job_details.state.created_timestamp_ms / 1000)
            started_time = datetime.fromtimestamp(job_details.state.started_timestamp_ms / 1000)
            ended_time = datetime.fromtimestamp(job_details.state.ended_timestamp_ms / 1000)
            # Print job details neatly
            print(f"  Created at: {created_time}")
            print(f"  Started at: {started_time}")
            print(f"  Ended at:   {ended_time}")
            print(f"  Number of errors: {job_details.state.num_errors}")
            print(f"  Number of predictions: {job_details.state.num_predictions}")
            break
        elif status == "FAILED":
            # Job has failed
            print("\nJob failed:")
            # Convert timestamps from milliseconds to datetime objects
            created_time = datetime.fromtimestamp(job_details.state.created_timestamp_ms / 1000)
            started_time = datetime.fromtimestamp(job_details.state.started_timestamp_ms / 1000)
            ended_time = datetime.fromtimestamp(job_details.state.ended_timestamp_ms / 1000)
            # Print error details neatly
            print(f"  Created at: {created_time}")
            print(f"  Started at: {started_time}")
            print(f"  Ended at:   {ended_time}")
            print(f"  Error message: {job_details.state.message}")
            break

        # Increase the delay exponentially, maxing out at 16 seconds
        delay = min(delay * 2, 16)

def process_predictions(job_predictions: List[UnionPredictResult], start_time, end_time, n_top_values, peak_threshold):
    """
    Processes the job predictions to display top emotions and peaked emotions within a specified time range.
    
    This example is for facial expressions (i.e., the FACE model). It may be modified for use with other models.
    """
    emotions_dict = {}
    peaked_emotions = {}

    # Iterate over the predictions
    for file in job_predictions:
        for prediction in file.results.predictions:
            for grouped_prediction in prediction.models.face.grouped_predictions:
                for face_prediction in grouped_prediction.predictions:
                    time = face_prediction.time
                    # Check if the prediction is within the specified time range
                    if start_time <= time <= end_time:
                        for emotion in face_prediction.emotions:
                            # Accumulate emotion scores
                            emotions_dict[emotion.name] = emotions_dict.get(emotion.name, 0) + emotion.score
                            # Record emotions that exceed the peak threshold
                            if emotion.score >= peak_threshold:
                                peaked_emotions[emotion.name] = (emotion.score, time)

    # Calculate average scores for each emotion
    emotion_counts = {emotion: 0 for emotion in emotions_dict}
    for emotion in emotions_dict:
        emotion_counts[emotion] += 1
    emotions_average = {emotion: emotions_dict[emotion] / emotion_counts[emotion] for emotion in emotions_dict}

    # Sort emotions by average score in descending order
    sorted_emotions = sorted(emotions_average.items(), key=lambda item: item[1], reverse=True)

    # Display top N emotions
    print(f'\nThe top {n_top_values} expressed emotions between timestamp {start_time} and {end_time} are:')
    for emotion, score in sorted_emotions[:n_top_values]:
        print(f"{emotion}")

    # Display peaked emotions
    print(f'\nThe emotions that peaked over {peak_threshold}:')
    for emotion, (score, time) in peaked_emotions.items():
        print(f"{emotion} with a score of {score:.2f} at {time} seconds")

if __name__ == "__main__":
    asyncio.run(main())
