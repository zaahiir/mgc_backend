"""JWT authentication that keeps admin and member identities apart.

The previous CustomJWTAuthentication looked a member up with
``User.objects.get(id=member_id)`` — it fed a MemberModel primary key into the
``auth_user`` table. Those are two unrelated id spaces, so a member whose
MemberModel.id happened to match a staff row's User.id was authenticated *as
that staff user*. Member id 1 resolving to the first superuser is the obvious
case. Identity is resolved from the token's ``user_type`` claim here instead,
and a member principal can never carry staff or superuser flags.
"""

from django.contrib.auth.models import User
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from .models import MemberModel


class MemberPrincipal:
    """``request.user`` for a member-issued token.

    Deliberately not a Django ``User``: members live in MemberModel and must
    never inherit the auth_user permission flags. ``id`` is the MemberModel
    primary key, which is what every member-facing view needs.
    """

    is_authenticated = True
    is_anonymous = False
    is_active = True
    # Hard-coded rather than derived. A member principal is never privileged.
    is_staff = False
    is_superuser = False
    user_type = 'member'

    def __init__(self, member):
        self.member = member
        self.id = member.id
        self.pk = member.id
        self.email = member.email
        self.username = member.email

    def __str__(self):
        return f'member:{self.id}'

    def has_perm(self, perm, obj=None):
        return False

    def has_module_perms(self, app_label):
        return False


class RoleAwareJWTAuthentication(JWTAuthentication):
    """Resolve the principal from the token's ``user_type`` claim."""

    def get_user(self, validated_token):
        user_type = validated_token.get('user_type')

        if user_type == 'member':
            member_id = validated_token.get('member_id')
            if not member_id:
                raise AuthenticationFailed('Token is missing member_id', code='invalid_token')
            try:
                member = MemberModel.objects.get(id=member_id, hideStatus=0)
            except MemberModel.DoesNotExist:
                # Covers deleted/hidden members still holding a live token.
                raise AuthenticationFailed('Member account is no longer active', code='user_inactive')
            return MemberPrincipal(member)

        # Admin/staff path: a genuine auth_user row, resolved by SimpleJWT's
        # own user_id claim. Privilege is then decided by permissions.IsAdmin.
        user = super().get_user(validated_token)
        if not user.is_active:
            raise AuthenticationFailed('User is inactive', code='user_inactive')
        # Annotate so views can branch without re-reading the token.
        user.user_type = 'admin' if (user.is_superuser or user.is_staff) else 'user'
        return user


def issue_member_tokens(member):
    """Mint an access/refresh pair carrying the member role claims.

    Kept next to the authentication class so the claims written here and the
    claims read in ``get_user`` cannot drift apart.
    """
    from rest_framework_simplejwt.tokens import RefreshToken

    # SimpleJWT needs a real auth_user row to hang user_id off; members get a
    # non-privileged shadow account. It is never used to authorise anything.
    django_user, _ = User.objects.get_or_create(
        username=member.email,
        defaults={
            'email': member.email,
            'first_name': member.firstName or '',
            'last_name': member.lastName or '',
            'is_active': True,
            'is_staff': False,
            'is_superuser': False,
        },
    )
    # Defence in depth: if this shadow row was ever promoted, demote it.
    if django_user.is_staff or django_user.is_superuser:
        django_user.is_staff = False
        django_user.is_superuser = False
        django_user.save(update_fields=['is_staff', 'is_superuser'])

    refresh = RefreshToken.for_user(django_user)
    for token in (refresh, refresh.access_token):
        token['member_id'] = member.id
        token['user_type'] = 'member'
        token['email'] = member.email
    return refresh


def issue_admin_tokens(user):
    """Mint an access/refresh pair for a staff/superuser login."""
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(user)
    for token in (refresh, refresh.access_token):
        token['user_type'] = 'admin'
        token['email'] = user.email
    return refresh
