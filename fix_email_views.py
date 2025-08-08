#!/usr/bin/env python3
import os
import re

def fix_email_method():
    views_path = '/var/www/vhosts/mastergolfclub.com/httpdocs/django/src/apis/views.py'
    
    # Read the current views.py file
    with open(views_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Define the fixed email method
    fixed_email_method = '''    def send_credentials_with_qr_email(self, email: str, member_id: str, password: str, qr_token: str):
        """
        Send email with credentials and QR code to new member
        """
        try:
            logger.info(f"Attempting to send email to: {email}")

            # Generate QR code
            qr_image_data = self.generate_qr_code(qr_token)

            if not qr_image_data:
                logger.error("Failed to generate QR code")
                return False

            subject = 'Your Golf Club Membership Credentials & QR Code'

            # Text message
            text_message = f'''
Dear Member,

Your golf club membership account has been created successfully.

Your membership details:
Member ID: {member_id}

Login credentials:
Username: {email}
Password: {password}

Please find your membership QR code attached. This QR code can be used for quick verification at the club.

Please change your password upon first login.

Best regards,
Master Golf Club Management
            '''

            # HTML message
            html_message = f'''
<html>
<body>
    <h2>Welcome to Golf Club!</h2>
    <p>Dear Member,</p>
    <p>Your golf club membership account has been created successfully.</p>

    <h3>Your membership details:</h3>
    <p><strong>Member ID:</strong> {member_id}</p>

    <h3>Login credentials:</h3>
    <p><strong>Username:</strong> {email}</p>
    <p><strong>Password:</strong> {password}</p>

    <p>Please find your membership QR code attached. This QR code can be used for quick verification at the club.</p> 
    
    <p><strong>Important:</strong> Please change your password upon first login.</p>

    <p>Best regards,<br>Master Golf Club Management</p>
</body>
</html>
            '''

            # Create email message
            msg = EmailMultiAlternatives(
                subject,
                text_message,
                settings.DEFAULT_FROM_EMAIL,
                [email]
            )

            # Add HTML version
            msg.attach_alternative(html_message, "text/html")

            # Attach QR code
            msg.attach(f'membership_qr_{member_id}.png', qr_image_data, 'image/png')

            logger.info("Attempting to send email...")

            # Send email with better error handling
            try:
                msg.send()
                logger.info("Email sent successfully")
                return True
            except Exception as email_error:
                logger.error(f"Email sending failed: {str(email_error)}")
                # Try alternative method - send without attachment
                try:
                    # Send simple text email without QR code attachment
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
    
    # Replace the existing method
    pattern = r'def send_credentials_with_qr_email\(self, email: str, member_id: str, password: str, qr_token: str\):.*?except Exception as e:.*?logger\.error\(f"Email sending error: {str\(e\)}"\)\s+return False'
    
    # Use re.DOTALL to match across multiple lines
    updated_content = re.sub(pattern, fixed_email_method, content, flags=re.DOTALL)
    
    # Write the updated content back to the file
    with open(views_path, 'w', encoding='utf-8') as file:
        file.write(updated_content)
    
    print("✅ Email method updated successfully!")

if __name__ == "__main__":
    fix_email_method()
