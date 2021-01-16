const sdk = require("microsoft-cognitiveservices-speech-sdk");
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const multer = require('multer');
const fs = require('fs');
const speechConfig = sdk.SpeechConfig.fromSubscription("0deae8e94a7c439691289f32093d2c67", "canadacentral");
let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'recordings/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
let upload = multer({storage: storage});

const app = express();


app.use(express.static("public"));
app.use(express.json());
app.use(session({ secret: "cats" }));
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// finds the number of question a student asks by counting the question marks in their section of the transcription
function findNumQuestions(words) {
    let numQuestions = 0;
    for (let i = 0; i < words.length; i++) {
        if (words[i].text.includes("?")) {
            numQuestions++;
        }
    }
    return numQuestions;
}

function determineResponsiveness(speakerOrder) {
    // this assumes the first speaker is the teacher

}

function countWords(json) {
    // arrays for holding the statistics
    let speakers = [];
    let wordCount = [];
    let speakingTime = [];
    let questionsAsked = [];
    // holds the order of the speakers, helps us determine student responsiveness
    let speakerOrder = [];
    // goes through all the text in order of who speaks
    for (let i = 0; i < json.length; i++) {
        // if the speaker isn't in the array add them and all their stats
        if (!speakers.includes(json[i].speaker)) {
            speakers.push(json[i].speaker);
            wordCount.push(json[i].words.length);
            speakingTime.push(json[i].data_end - json[i].data_start);
            questionsAsked.push(findNumQuestions(json[i].words));
            speakerOrder.push(json[i].speaker);
        }
        // continues after all speakers have been added
        speakerOrder.push(json[i].speaker);
        let speakerID = speakers.indexOf(json[i].speaker);
        wordCount[speakerID] += json[i].words.length;
        speakingTime[speakerID] += json[i].data_end - json[i].data_start;
        questionsAsked[speakerID] += findNumQuestions(json[i].words);
    }
    let speakerResponsiveness = determineResponsiveness(speakerOrder);
    console.log(speakers, wordCount, speakingTime, questionsAsked);
}

// post endpoint for uploading files
app.post("/uploadAudio", upload.single('recording'), (req, res) => {
    console.log(req.file.filename);
    fs.readFile('recordings/' + req.file.filename, 'utf8', (err, jsonString) => {
        if (err) {
            console.log("error");
            return;
        }
        const json = JSON.parse(jsonString.substring(1));
        countWords(json);
    });

    res.json({message: "file uploaded"});
});

// sends the audio file to microsoft to transcribe
function fromFile() {
    var format = sdk.AudioStreamFormat.getWaveFormatPCM(44100, 16, 2); //44.1 kHz, 16-bit, 2-channel
    var pushStream = sdk.AudioInputStream.createPushStream(format);

    fs.createReadStream("recordings/test_recording.wav").on('data', function(arrayBuffer) {
        pushStream.write(arrayBuffer.slice());
    }).on('end', function() {
        pushStream.close();
    });

    let audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    let recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    recognizer.recognizeOnceAsync(result => {
        switch (result.reason) {
            case sdk.ResultReason.RecognizedSpeech:
                console.log(`RECOGNIZED: Text=${result.text}`);
                break;
            case sdk.ResultReason.NoMatch:
                let noMatchDetail = sdk.NoMatchDetails.fromResult(result);
                console.log("(recognized)  Reason: " + sdk.ResultReason[result.reason] + " NoMatchReason: " + sdk.NoMatchReason[noMatchDetail.reason]);
                console.log("NOMATCH: Speech could not be recognized.");
                break;
            case sdk.ResultReason.Canceled:
                const cancellation = sdk.CancellationDetails.fromResult(result);
                console.log(`CANCELED: Reason=${cancellation.reason}`);

                if (cancellation.reason == sdk.CancellationReason.Error) {
                    console.log(`CANCELED: ErrorCode=${cancellation.ErrorCode}`);
                    console.log(`CANCELED: ErrorDetails=${cancellation.errorDetails}`);
                    console.log("CANCELED: Did you update the subscription info?");
                }
            break;
        }
        console.log(`RECOGNIZED: Text=${result.text}`);
        recognizer.close();
    });
}
// fromFile();


let port = process.env.PORT;
if (port == null || port == "") {
    port = 5000;
}

// listen for requests :)
const listener = app.listen(port, () => {
    console.log("Your app is listening on port " + listener.address().port);
});


