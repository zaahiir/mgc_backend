"""Role-based permissions and the per-action wiring used by every ViewSet.

Project rule: DEFAULT_PERMISSION_CLASSES is IsAuthenticated, and anything
public opts in explicitly through a ViewSet's ``permission_map``. A ViewSet
that declares no map therefore stays admin-only, which is the safe direction
to fail.
"""

from rest_framework.permissions import SAFE_METHODS, AllowAny, BasePermission, IsAuthenticated

__all__ = [
    'AllowAny',
    'IsAuthenticated',
    'IsAdmin',
    'IsMember',
    'IsAdminOrMember',
    'IsSelfOrAdmin',
    'ActionPermissionMixin',
]


class IsAdmin(BasePermission):
    """Staff or superuser, authenticated through the admin token path."""

    message = 'Administrator privileges are required for this action.'

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        return bool(
            user
            and user.is_authenticated
            # MemberPrincipal pins both of these to False, so a member token
            # can never satisfy this check.
            and (getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False))
        )


class IsMember(BasePermission):
    """A club member authenticated with a member-issued token."""

    message = 'A member account is required for this action.'

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        return bool(
            user
            and user.is_authenticated
            and getattr(user, 'user_type', None) == 'member'
        )


class IsAdminOrMember(BasePermission):
    """Either role — for endpoints both apps legitimately share."""

    message = 'Authentication is required for this action.'

    def has_permission(self, request, view):
        return IsAdmin().has_permission(request, view) or IsMember().has_permission(request, view)


class IsSelfOrAdmin(BasePermission):
    """Members may only address their own record; admins may address any.

    Applies to the ``/member/{pk}/...`` detail routes, where ``pk`` is the
    MemberModel id and was previously trusted without checking whose it was.
    """

    message = 'You may only access your own member record.'

    def has_permission(self, request, view):
        if IsAdmin().has_permission(request, view):
            return True
        if not IsMember().has_permission(request, view):
            return False
        target = view.kwargs.get('pk')
        if target is None:
            return True  # collection route; the view resolves identity itself
        try:
            return int(target) == int(request.user.id)
        except (TypeError, ValueError):
            return False


class PublicCreateOnly(BasePermission):
    """Anonymous callers may create, but never read or modify.

    The enquiry/contact/message endpoints reuse one ``processing`` action for
    both create and update, keyed on an id of "0" meaning "new". Opening the
    whole action to the public would also open editing of existing records, so
    the id is checked here and anything else falls through to admin.
    """

    message = 'Only new submissions may be posted anonymously.'
    _NEW_IDS = {'0', 0}

    def has_permission(self, request, view):
        if IsAdmin().has_permission(request, view):
            return True
        if request.method != 'POST':
            return False
        # Any of the id kwargs these viewsets use.
        for key in ('pk', 'enquiry_id', 'message_id'):
            if key in view.kwargs:
                return view.kwargs[key] in self._NEW_IDS
        # detail=False create routes carry no id at all.
        return True


class ActionPermissionMixin:
    """Resolve permissions per action from an explicit map.

    ``permission_map`` maps a DRF action name to a list of permission classes.
    Anything not listed falls back to ``default_permissions``, which is
    admin-only unless a ViewSet says otherwise.
    """

    permission_map: dict = {}
    default_permissions: list = [IsAdmin]

    def get_permissions(self):
        classes = self.permission_map.get(self.action, self.default_permissions)
        return [cls() for cls in classes]


# Read-only actions shared by the public marketing site (mastergolfclub.com).
# Listed once so the public surface is auditable in a single place.
PUBLIC_READ_ACTIONS = ('list', 'retrieve', 'listing')
