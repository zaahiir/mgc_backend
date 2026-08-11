"""Move members onto hashed-only passwords and drop the reversible columns.

Order matters: any member who only ever had a plaintext or Fernet-encrypted
password is migrated to a hash first, so nobody is locked out when the source
columns are removed in the same transaction.
"""

from django.db import migrations, models

import apis.validators


def forwards_hash_legacy_passwords(apps, schema_editor):
    from django.contrib.auth.hashers import make_password

    Member = apps.get_model('apis', 'MemberModel')

    # Rebuild the old Fernet key exactly as apis.utils.PasswordManager did, so
    # encrypted rows can still be recovered during this one migration.
    decrypt = _legacy_decrypter()

    migrated, orphaned = 0, 0
    for member in Member.objects.all().iterator():
        if member.hashed_password:
            continue

        plain = member.password or None
        if not plain and member.encrypted_password and decrypt:
            plain = decrypt(member.encrypted_password)

        if plain:
            member.hashed_password = make_password(plain)
            migrated += 1
        else:
            # No recoverable credential. Leaving hashed_password empty means
            # login fails closed; these members must use "forgot password".
            orphaned += 1
            continue
        member.save(update_fields=['hashed_password'])

    print(f'  members migrated to hashed password: {migrated}')
    if orphaned:
        print(f'  members with no recoverable password (must reset): {orphaned}')


def _legacy_decrypter():
    """Return a callable that decrypts a legacy encrypted_password, or None.

    The old ENCRYPTION_KEY was regenerated on every process start, so in
    practice these values are already undecryptable. Handled anyway in case a
    deployment pinned the key.
    """
    try:
        import base64

        from cryptography.fernet import Fernet
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        from django.conf import settings

        key_source = getattr(settings, 'ENCRYPTION_KEY', None)
        if not key_source:
            return None

        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(), length=32, salt=b'static_salt', iterations=100000
        )
        cipher = Fernet(base64.urlsafe_b64encode(kdf.derive(key_source.encode())))

        def decrypt(value):
            try:
                return cipher.decrypt(base64.urlsafe_b64decode(value.encode())).decode()
            except Exception:
                return None

        return decrypt
    except Exception:
        return None


def backwards(apps, schema_editor):
    # Plaintext/reversible passwords are not restorable, by design.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('apis', '0048_alter_membermodel_golfclubid'),
    ]

    operations = [
        migrations.RunPython(forwards_hash_legacy_passwords, backwards),
        migrations.RemoveField(model_name='membermodel', name='password'),
        migrations.RemoveField(model_name='membermodel', name='encrypted_password'),
        migrations.AddField(
            model_name='membermodel',
            name='reset_attempts',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='membermodel',
            name='profilePhoto',
            field=models.ImageField(
                blank=True, null=True, upload_to='member_photos/',
                validators=[apis.validators.validate_image_upload],
            ),
        ),
        migrations.AlterField(
            model_name='membermodel',
            name='idProof',
            field=models.FileField(
                blank=True, null=True, upload_to='member_id_proofs/',
                validators=[apis.validators.validate_document_upload],
            ),
        ),
    ]
