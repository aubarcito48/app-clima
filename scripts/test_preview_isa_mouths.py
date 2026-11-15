"""Small offline checks for malformed WAV/cue inputs to the review tool."""

import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
import wave

spec = importlib.util.spec_from_file_location('isa_preview', Path(__file__).with_name('preview-isa-mouths.py'))
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)


def audio_bytes(cues=None, *, extra=b''):
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as stream:
        stream.setparams((1, 2, 8000, 0, 'NONE', 'not compressed'))
        stream.writeframes(b'\x00\x00' * 8000)
    audio = buffer.getvalue()
    if cues is not None:
        payload = json.dumps(cues).encode('ascii')
        audio += b'isav' + len(payload).to_bytes(4, 'little') + payload + b'\x00' * (len(payload) % 2)
    audio += extra
    return audio[:4] + (len(audio) - 8).to_bytes(4, 'little') + audio[8:]


class AudioInputChecks(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / 'test.wav'
        self.cues = [{'start': 0, 'end': .5, 'value': 'B'}, {'start': .5, 'end': 1, 'value': 'X'}]

    def read(self, content):
        self.path.write_bytes(content)
        return preview.read_audio(self.path)

    def test_valid_audio_and_silence_are_preserved(self):
        original = audio_bytes(self.cues)
        audio, cues, duration = self.read(original)
        self.assertEqual(audio, original)
        self.assertEqual(cues[-1]['value'], 'X')
        self.assertEqual(duration, 1)

    def test_missing_metadata_is_rejected(self):
        with self.assertRaises(ValueError): self.read(audio_bytes())

    def test_incomplete_audio_coverage_is_rejected(self):
        self.cues[-1]['end'] = .8
        with self.assertRaises(ValueError): self.read(audio_bytes(self.cues))

    def test_unknown_shape_and_boolean_time_are_rejected(self):
        for cue in [{'start': False, 'end': 1, 'value': 'A'}, {'start': 0, 'end': 1, 'value': 'AB'}]:
            with self.subTest(cue=cue), self.assertRaises(ValueError): self.read(audio_bytes([cue]))

    def test_nan_and_overlapping_cues_are_rejected(self):
        for start in [float('nan'), .2]:
            self.cues[1]['start'] = start
            with self.subTest(start=start), self.assertRaises(ValueError): self.read(audio_bytes(self.cues))

    def test_truncated_riff_and_duplicate_metadata_are_rejected(self):
        original = audio_bytes(self.cues)
        with self.assertRaises(ValueError): self.read(original[:-1])
        with self.assertRaises(ValueError): self.read(audio_bytes(self.cues, extra=b'isav\x02\x00\x00\x00[]'))

    def test_partial_trailing_chunk_is_rejected(self):
        with self.assertRaises(ValueError): self.read(audio_bytes(self.cues, extra=b'isav'))

    def test_invalid_input_does_not_overwrite_existing_preview(self):
        self.path.write_bytes(audio_bytes())
        output = Path(self.directory.name) / 'index.html'
        output.write_text('Existing preview', encoding='utf8')
        with self.assertRaises(ValueError): preview.build(self.path, output)
        self.assertEqual(output.read_text(encoding='utf8'), 'Existing preview')


if __name__ == '__main__':
    unittest.main()
