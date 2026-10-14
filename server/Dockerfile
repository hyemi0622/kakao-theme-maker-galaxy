FROM eclipse-temurin:17-jdk-jammy
RUN apt-get update && apt-get install -y --no-install-recommends curl unzip nodejs npm \
    && rm -rf /var/lib/apt/lists/*
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
RUN mkdir -p /opt/android-sdk/cmdline-tools \
    && curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/tools.zip \
    && unzip -q /tmp/tools.zip -d /opt/android-sdk/cmdline-tools \
    && mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest \
    && rm /tmp/tools.zip
RUN yes | /opt/android-sdk/cmdline-tools/latest/bin/sdkmanager --licenses >/dev/null
RUN /opt/android-sdk/cmdline-tools/latest/bin/sdkmanager 'platforms;android-35' 'build-tools;35.0.0'
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY android-template ./android-template
COPY server ./server
# Preserve Gradle cache; mount /root/.android separately for the signing key.
ENV GRADLE_USER_HOME=/data/gradle
ENV HOST=0.0.0.0
EXPOSE 8787
CMD ["node", "server/android-build.mjs"]
