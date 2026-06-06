# === STAGE 1: Build & Compile Extensions ===
FROM php:8.2-cli AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
        libicu-dev \
        libpq-dev \
        libssl-dev \
        unzip \
        zip \
    && pecl install mongodb-1.17.1 \
    && docker-php-ext-enable mongodb \
    && docker-php-ext-install bcmath intl pdo_pgsql \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

WORKDIR /app

# Copy lock files and install vendor dependencies in an isolated stage
COPY composer.json composer.lock symfony.lock ./
ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=-1
RUN composer install --no-interaction --prefer-dist --no-scripts --optimize-autoloader --no-cache

# === STAGE 2: Final Runtime Image ===
FROM php:8.2-cli

# Re-install runtime requirements (much lighter than compiling things)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libicu-dev \
        libpq-dev \
        libssl-dev \
        unzip \
        zip \
    && rm -rf /var/lib/apt/lists/*

# Copy the compiled PHP extensions and Composer binary from Stage 1
COPY --from=builder /usr/local/lib/php/extensions/ /usr/local/lib/php/extensions/
COPY --from=builder /usr/local/etc/php/conf.d/ /usr/local/etc/php/conf.d/
COPY --from=builder /usr/local/bin/composer /usr/local/bin/composer

WORKDIR /var/www/html

ENV APP_ENV=dev \
    APP_DEBUG=1 \
    APP_SECRET=change_me \
    COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=-1 \
    CORS_ALLOW_ORIGIN='^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$' \
    DATABASE_URL='postgresql://app:!ChangeMe!@127.0.0.1:5432/app?serverVersion=16&charset=utf8' \
    DEFAULT_URI=http://localhost:8000 \
    JWT_PASSPHRASE=b3a48db79312c1652086267ef6f479dd7c4671c99874b5f7a29f8761935857fc \
    JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem \
    JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem \
    MONGODB_DB=app \
    MONGODB_URI=mongodb://mongodb:27017

# Copy vendor dependencies built in Stage 1
COPY --from=builder /app/vendor ./vendor
COPY . .

RUN mkdir -p var/cache var/log config/jwt \
    && composer dump-autoload --no-interaction --optimize \
    && openssl genpkey -out config/jwt/private.pem -aes256 -algorithm rsa -pkeyopt rsa_keygen_bits:4096 -pass env:JWT_PASSPHRASE \
    && openssl pkey -in config/jwt/private.pem -out config/jwt/public.pem -pubout -passin env:JWT_PASSPHRASE

EXPOSE 8000

CMD ["bash", "-lc", "mkdir -p var/cache var/log; if [ ! -f vendor/autoload_runtime.php ]; then composer install --no-interaction --prefer-dist --optimize-autoloader; fi; php -S 0.0.0.0:8000 -t public public/index.php"]
