import base64
import os
import time
import wave
import uuid

class MessagePlaybackExt:
    def __init__(self, owner_comp):
        self.owner_comp = owner_comp
        self.messages = []
        self.timer_chop = op("timer1")
        self.audio_file_chop = op("audiofilein1")
        self.audio_dir = os.path.join(self.owner_comp.var('project.folder'), 'temp_audio')

        if not os.path.exists(self.audio_dir):
            os.makedirs(self.audio_dir)

    def Handle_ws_msg(self, msg):
        # Handle incoming WebSocket messages and add them to the messages queue
        decoded_data = base64.b64decode(msg)
        self.Add_item(decoded_data)
        self.check_messages()

    def check_messages(self):
        if self.timer_chop['done'].eval() and self.audio_file_chop.par.file == '':
            self.play_next_item()

    def Add_item(self, audio_data):
        filename = f"audio_{uuid.uuid4()}.wav"
        filepath = os.path.join(self.audio_dir, filename)
        with open(filepath, "wb") as audio_file:
            audio_file.write(audio_data)
        self.messages.append(filepath)

    def Remove_item(self):
        # Remove the first item in the messages and clean up the file
        self.audio_file_chop.par.file = ''
        if self.messages:
            filepath = self.messages.pop(0)
            if os.path.exists(filepath):
                os.remove(filepath)
            self.check_messages()

    def play_next_item(self):
        if self.messages:
            # Start playing the next item in the messages
            filepath = self.messages[0]
            self.audio_file_chop.par.file = filepath

            # Start the timer
            audio_duration = self.get_audio_duration(filepath)
            self.timer_chop.par.length = audio_duration
            self.timer_chop.par.start.pulse()

    def get_audio_duration(self, filepath):
        try:
            with wave.open(filepath, 'rb') as audio_file:
                frames = audio_file.getnframes()
                rate = audio_file.getframerate()
                duration = frames / float(rate)
                return duration
        except wave.Error as e:
            print(f'Wave error: {e}')
            return 0