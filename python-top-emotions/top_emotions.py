from hume import HumeBatchClient
from hume.models.config import FaceConfig
from hume.models.config import ProsodyConfig
import json

client = HumeBatchClient("<YOUR_API_KEY>")
urls = ["<YOUR_URL_FILES>"]

face_config = FaceConfig()
prosody_config = ProsodyConfig()

job = client.submit_job(urls, [face_config, prosody_config])
print(job)
print("Running...")

result = job.await_complete()
job_predictions = client.get_job_predictions(job_id=job.id)

# The start and end time range of predictions to be processed
start_time = 0
end_time = 12

# Top n emotions
n_top_values = 5

# A threshold of what is defined as a peaked emotion
peak_threshold = .7

emotions_dict = dict()
peaked_emotions_w_score_time_dict = dict()


# This for facial expressions. This can be modified for other models
for file in job_predictions:
    for prediction in file['results']['predictions']:
        for grouped_prediction in prediction['models']['face']['grouped_predictions']:
            for grouped_prediction_prediction in grouped_prediction['predictions']:
                if grouped_prediction_prediction['time'] >= start_time and grouped_prediction_prediction['time'] <= end_time:
                    for emotion in grouped_prediction_prediction['emotions']:
                        if emotion['name'] not in emotions_dict:
                            emotions_dict[emotion['name']] = emotion['score']
                        else:
                            emotions_dict[emotion['name']] = emotions_dict[emotion['name']] + emotion['score']
                        if emotion['score'] >= peak_threshold:
                            peaked_emotions_w_score_time_dict.update({emotion['name']: (emotion['score'], grouped_prediction_prediction['time']) })

emotions_average = dict()
emotion_dict_length = len(emotions_dict)

for emotion, score in emotions_dict.items():
        emotions_average[emotion] = score / emotion_dict_length

ascend_sorted_emotion_average = sorted(emotions_average, key=emotions_average.get, reverse=True)

print ('The top {} expressed emotions are between timestamp {} and {} : '.format(n_top_values, start_time, end_time))

for i in range(0,n_top_values):
    print(ascend_sorted_emotion_average[i])

print('The emotions that peaked over ' + str(peak_threshold) + ' : ')
for peaked_emotions, score_time in peaked_emotions_w_score_time_dict.items():
    print("{} with score of {} at {}".format(peaked_emotions,score_time[0], score_time[1]))