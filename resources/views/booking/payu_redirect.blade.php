<!DOCTYPE html>
<html>
<head>
    <title>Redirecting to Payment...</title>
</head>
<body onload="document.forms['payuForm'].submit()">
    <div style="text-align: center; margin-top: 50px;">
        <h2>Please wait, redirecting to payment gateway...</h2>
        <p>Do not refresh the page or press the back button.</p>
    </div>

    <form action="{{ $payuUrl }}" method="post" name="payuForm">
        <input type="hidden" name="key" value="{{ $merchantKey }}" />
        <input type="hidden" name="hash" value="{{ $hash }}" />
        <input type="hidden" name="txnid" value="{{ $params['txnid'] }}" />
        <input type="hidden" name="amount" value="{{ $params['amount'] }}" />
        <input type="hidden" name="firstname" value="{{ $params['firstname'] }}" />
        <input type="hidden" name="email" value="{{ $params['email'] }}" />
        <input type="hidden" name="phone" value="{{ $params['phone'] }}" />
        <input type="hidden" name="productinfo" value="{{ $params['productinfo'] }}" />
        <input type="hidden" name="surl" value="{{ $params['surl'] }}" />
        <input type="hidden" name="furl" value="{{ $params['furl'] }}" />
        <input type="hidden" name="service_provider" value="payu_paisa" />
    </form>
</body>
</html>
