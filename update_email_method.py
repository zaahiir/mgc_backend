#!/usr/bin/env python3
import os

def update_email_method():
    views_path = '/var/www/vhosts/mastergolfclub.com/httpdocs/django/src/apis/views.py'
    
    # Read the current file
    with open(views_path, 'r', encoding='utf-8') as file:
        lines = file.readlines()
    
    # Find the start and end of the email method
    start_line = None
    end_line = None
    
    for i, line in enumerate(lines):
        if 'def send_credentials_with_qr_email' in line:
            start_line = i
        elif start_line and 'return False' in line and i > start_line + 80:
            end_line = i + 1
            break
    
    if start_line is None or end_line is None:
        print("❌ Could not find email method")
        return
    
    # Create the updated method
    updated_method = '''    def send_credentials_with_qr_email(self, email: str, member_id: str, password: str, qr_token: str):
        """
        Send email with credentials and QR code to new member
        """
        try:
            logger.info(f"Attempting to send email to: {email}")

            # Generate QR code
            qr_image_data = self.generate_qr_code(qr_token)

            if not qr_image_data:
                logger.error("Failed to generate QR code")
                # Continue without QR code

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
                    msg.attach_alternative(html_message, "text/html")
                    msg.attach(f'membership_qr_{member_id}.png', qr_image_data, 'image/png')
                    msg.send()
                    logger.info("Email sent successfully with QR code")
                    return True
                except Exception as attachment_error:
                    logger.error(f"Email with attachment failed: {str(attachment_error)}")
                    # Fall back to simple email
            
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
            return False
'''
    
    # Replace the method
    lines[start_line:end_line] = updated_method.splitlines(True)
    
    # Write back to file
    with open(views_path, 'w', encoding='utf-8') as file:
        file.writelines(lines)
    
    print("✅ Email method updated successfully!")

if __name__ == "__main__":
    update_email_method()
