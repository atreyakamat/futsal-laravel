# Deployment Guide

This guide provides instructions for deploying the Futsal Laravel application to a production environment.

## Prerequisites

- **PHP 8.2+**
- **Composer**
- **Node.js & NPM**
- **Database:** SQLite (default), MySQL, or PostgreSQL
- **Web Server:** Nginx (recommended) or Apache
- **Process Manager:** Supervisor (for background queues)

## 1. Server Preparation

### Install Dependencies (Ubuntu/Debian example)
```bash
sudo apt update
sudo apt install -y php8.2-cli php8.2-fpm php8.2-mysql php8.2-sqlite3 php8.2-xml php8.2-curl php8.2-mbstring php8.2-zip php8.2-intl php8.2-gd php8.2-redis unzip nginx supervisor
```

### Install Composer
```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

## 2. Application Setup

### Clone and Install
```bash
git clone <repository-url> /var/www/futsal-laravel
cd /var/www/futsal-laravel

# Install PHP dependencies
composer install --optimize-autoloader --no-dev

# Install Node dependencies and build assets
npm install
npm run build
```

### Environment Configuration
Copy the example environment file and update the variables:
```bash
cp .env.example .env
php artisan key:generate --ansi
```

**Required Production Settings in `.env`:**
- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL=https://yourdomain.com`
- `DB_CONNECTION=mysql` (or your preferred DB)
- `MAIL_MAILER=ses` (configured with AWS credentials)
- `AISENSY_API_KEY=` (for WhatsApp notifications)
- `OPENROUTER_API_KEY=` (for AI features)

### Database and Permissions
```bash
# Run migrations
php artisan migrate --force

# Set directory permissions
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

## 3. Web Server Configuration (Nginx)

Create a new Nginx configuration file: `/etc/nginx/sites-available/futsal`

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/futsal-laravel/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/futsal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 4. Queue Worker (Supervisor)

The application uses background queues for WhatsApp notifications and AI processing. Create a Supervisor config: `/etc/supervisor/conf.d/futsal-worker.conf`

```ini
[program:futsal-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/futsal-laravel/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/futsal-laravel/storage/logs/worker.log
stopwaitsecs=3600
```

Update and start Supervisor:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start futsal-worker:*
```

## 5. Scheduler (Cron Job)

The application relies on the Laravel Scheduler to clean up expired slot locks every minute.

Add the following entry to your server's crontab (running as the `www-data` user or the user that owns the project):

```bash
# Run as current user
crontab -e

# Add this line
* * * * * cd /var/www/futsal-laravel && php artisan schedule:run >> /dev/null 2>&1
```

## 6. Optimization Commands

Run these commands on every deployment:

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan filament:cache-components
```

## 7. SSL (Certbot)

Secure your site with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```
