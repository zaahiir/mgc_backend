#!/usr/bin/env python3
import subprocess
import os

def fix_email_method():
    views_path = '/var/www/vhosts/mastergolfclub.com/httpdocs/django/src/apis/views.py'
    
    # Create a temporary file with the updated method
    temp_content = '''    def send_credentials_with_qr_email(self, email: str, member_id: str, password: str, qr_token: str):
        """
        Send email with credentials and QR code to new member
        """
        try:
            logger.info(f"Attempting to send email to: {email}")

            # Generate QR code
            qr_image_data = self.generate_qr_code(qr_token)

            subject = 'Your Golf Club Membership Credentials & QR Code'

            # Text message
            text_message = f"Dear Member,\\n\\nYour golf club membership account has been created successfully.\\n\\nYour membership details:\\nMember ID: {member_id}\\n\\nLogin credentials:\\nUsername: {email}\\nPassword: {password}\\n\\nPlease change your password upon first login.\\n\\nBest regards,\\nMaster Golf Club Management"

            logger.info("Attempting to send email...")

            # Try sending with QR code attachment first
            if qr_image_data:
                try:
                    # Create email message with attachment
                    msg = EmailMultiAlternatives(
                        subject,
                        text_message,
                        settings.DEFAULT_FROM_EMAIL,
                        [email]
                    )
                    msg.attach(f'membership_qr_{member_id}.png', qr_image_data, 'image/png')
                    msg.send()
                    logger.info("Email sent successfully with QR code")
                    return True
                except Exception as attachment_error:
                    logger.error(f"Email with attachment failed: {str(attachment_error)}")
            
            # Fallback: Send simple email without attachment
            try:
                send_mail(
                    subject,
                    text_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                )
                logger.info("Simple email sent successfully (without QR code)")
                return True
            except Exception as simple_email_error:
                logger.error(f"Simple email also failed: {str(simple_email_error)}")
                return False

        except Exception as e:
            logger.error(f"Email sending error: {str(e)}")
            return False'''
    
    # Use sed to replace the method
    sed_commands = [
        f"sed -i '747,832c\\{temp_content}' {views_path}"
    ]
    
    for cmd in sed_commands:
        try:
            subprocess.run(cmd, shell=True, check=True)
            print("✅ Email method updated successfully!")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Error updating email method: {e}")
            return False

if __name__ == "__main__":
    fix_email_method()
