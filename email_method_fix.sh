#!/bin/bash

cd /var/www/vhosts/mastergolfclub.com/httpdocs/django/src/apis

# Create the updated email method
cat > email_method_temp.txt << 'EOF'
    def send_credentials_with_qr_email(self, email: str, member_id: str, password: str, qr_token: str):
        try:
            logger.info(f"Attempting to send email to: {email}")
            qr_image_data = self.generate_qr_code(qr_token)
            subject = "Your Golf Club Membership Credentials & QR Code"
            text_message = f"Dear Member,\n\nYour golf club membership account has been created successfully.\n\nYour membership details:\nMember ID: {member_id}\n\nLogin credentials:\nUsername: {email}\nPassword: {password}\n\nPlease change your password upon first login.\n\nBest regards,\nMaster Golf Club Management"
            logger.info("Attempting to send email...")
            if qr_image_data:
                try:
                    msg = EmailMultiAlternatives(subject, text_message, settings.DEFAULT_FROM_EMAIL, [email])
                    msg.attach(f"membership_qr_{member_id}.png", qr_image_data, "image/png")
                    msg.send()
                    logger.info("Email sent successfully with QR code")
                    return True
                except Exception as attachment_error:
                    logger.error(f"Email with attachment failed: {str(attachment_error)}")
            try:
                send_mail(subject, text_message, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=False)
                logger.info("Simple email sent successfully (without QR code)")
                return True
            except Exception as simple_email_error:
                logger.error(f"Simple email also failed: {str(simple_email_error)}")
                return False
        except Exception as e:
            logger.error(f"Email sending error: {str(e)}")
            return False
EOF

# Insert the method after line 744
sed -i '744r email_method_temp.txt' views.py

# Clean up
rm email_method_temp.txt

echo "✅ Email method added successfully!"
