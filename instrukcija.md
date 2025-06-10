gcloud auth login

gcloud config set project book-translator-439914

docker build --platform linux/amd64 -t sscom-monitor:latest .

docker tag sscom-monitor:latest gcr.io/book-translator-439914/sscom-monitor:latest

docker push gcr.io/book-translator-439914/sscom-monitor:latestq